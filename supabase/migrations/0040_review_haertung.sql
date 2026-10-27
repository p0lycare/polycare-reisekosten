-- Härtung nach dem Code-Review vom 27.10.2026

-- 1) Vier-Augen-Prinzip auch beim Vorschuss: wer genehmigt hat, zahlt nicht aus –
--    außer bei Vorschüssen von Admin oder Buchhaltung (wie bei der Belegprüfung, 0033)
create or replace function vorschuss_auszahlen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare v vorschuss; antragsteller_rolle rolle;
begin
  v := vorschuss_holen(p_id);
  if v.status <> 'genehmigt' then raise exception 'Der Vorschuss ist nicht genehmigt'; end if;
  if not darf_pruefen(v.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Auszahlung'; end if;
  select rolle into antragsteller_rolle from profile where id = v.mitarbeiter_id;
  if v.entschieden_von = auth.uid() and antragsteller_rolle not in ('admin', 'buchhaltung') then
    raise exception 'Genehmigung und Auszahlung müssen von verschiedenen Personen kommen';
  end if;
  if not exists (select 1 from reise where id = v.reise_id and status in ('entwurf', 'abgelehnt')) then
    raise exception 'Die Reise ist bereits eingereicht – der Vorschuss kann nicht mehr ausgezahlt werden';
  end if;
  update vorschuss set status = 'ausgezahlt', ausgezahlt_von = auth.uid(), ausgezahlt_am = now() where id = p_id;
  update reise set vorschuss_cent = v.betrag_cent where id = v.reise_id;
end;
$$;

-- 6) Auch ein genehmigter (noch nicht ausgezahlter) Vorschuss darf nicht mit der Reise verschwinden
create or replace function reise_loeschen_mit_vorschuss() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from vorschuss where reise_id = old.id and status in ('genehmigt', 'ausgezahlt')) then
    raise exception 'Zu dieser Reise gibt es einen genehmigten oder ausgezahlten Vorschuss – sie kann nicht gelöscht werden';
  end if;
  return old;
end;
$$;

-- 4) Auslagenabrechnungen: fester Monat, keine Fahrten (sonst Km-Geld in einer Auslagenabrechnung)
create function auslagen_festhalten() returns trigger
  language plpgsql as $$
begin
  if old.art = 'auslagen' and (new.beginn, new.ende) is distinct from (old.beginn, old.ende) then
    raise exception 'Der Monat einer Auslagenabrechnung kann nicht geändert werden';
  end if;
  return new;
end;
$$;
create trigger auslagen_festhalten before update of beginn, ende on reise
  for each row execute function auslagen_festhalten();

create function fahrt_nur_fuer_reisen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from reise where id = new.reise_id and art = 'auslagen') then
    raise exception 'Fahrten gibt es nur bei Reisen, nicht bei Auslagen';
  end if;
  return new;
end;
$$;
create trigger fahrt_nur_fuer_reisen before insert or update of reise_id on fahrt
  for each row execute function fahrt_nur_fuer_reisen();

-- 5) Verpflegungspauschale beim Einreichen festschreiben (wie die km-Sätze). Der Server schreibt den Stand
--    nach dem Einreichen; Reisende selbst dürfen das Feld nicht setzen.
alter table reise add column verpflegung_fest jsonb;

create function verpflegung_fest_schuetzen() returns trigger
  language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' and new.verpflegung_fest is not null
     or tg_op = 'UPDATE' and new.verpflegung_fest is distinct from old.verpflegung_fest then
    raise exception 'Die festgeschriebene Verpflegungspauschale setzt nur das System';
  end if;
  return new;
end;
$$;
create trigger verpflegung_fest_schuetzen before insert or update of verpflegung_fest on reise
  for each row execute function verpflegung_fest_schuetzen();
