-- Go-live-Paket nach dem Code-Review
-- Hinweis: Seit 0032 brauchen NEUE Funktionen ein ausdrückliches "grant execute ... to authenticated".

-- 1) Einreichen erst, wenn kein Vorschuss mehr offen ist (sonst könnte er nach der Prüfung noch ausgezahlt werden)
create or replace function reise_einreichen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise; e einstellungen;
begin
  r := reise_holen(p_id);
  if r.mitarbeiter_id is distinct from auth.uid() then raise exception 'Nur die reisende Person kann einreichen'; end if;
  if r.status not in ('entwurf', 'abgelehnt') then raise exception 'Reise wurde bereits eingereicht'; end if;
  if exists (select 1 from vorschuss where reise_id = p_id and status in ('beantragt', 'genehmigt')) then
    raise exception 'Der Vorschuss ist noch nicht ausgezahlt – bitte erst danach einreichen oder den Antrag zurückziehen';
  end if;
  select * into e from einstellungen;
  update reise set status = 'eingereicht', eingereicht_am = now(),
    km_satz_cent = e.km_satz_cent, km_steuerfrei_cent = e.km_steuerfrei_cent,
    ablehnungsgrund = null, freigeber_id = null, freigegeben_am = null
   where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion) values (p_id, auth.uid(), 'eingereicht');
end;
$$;

-- 2) Vorschuss nur genehmigen/auszahlen, solange die Reise noch nicht eingereicht ist
create or replace function vorschuss_genehmigen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare v vorschuss;
begin
  v := vorschuss_holen(p_id);
  if v.status <> 'beantragt' then raise exception 'Der Vorschuss wartet nicht auf Genehmigung'; end if;
  if not darf_genehmigen(v.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Genehmigung'; end if;
  if not exists (select 1 from reise where id = v.reise_id and status in ('entwurf', 'abgelehnt')) then
    raise exception 'Die Reise ist bereits eingereicht – ein Vorschuss ist nicht mehr möglich';
  end if;
  update vorschuss set status = 'genehmigt', entschieden_von = auth.uid(), entschieden_am = now() where id = p_id;
end;
$$;

create or replace function vorschuss_auszahlen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare v vorschuss;
begin
  v := vorschuss_holen(p_id);
  if v.status <> 'genehmigt' then raise exception 'Der Vorschuss ist nicht genehmigt'; end if;
  if not darf_pruefen(v.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Auszahlung'; end if;
  if not exists (select 1 from reise where id = v.reise_id and status in ('entwurf', 'abgelehnt')) then
    raise exception 'Die Reise ist bereits eingereicht – der Vorschuss kann nicht mehr ausgezahlt werden';
  end if;
  update vorschuss set status = 'ausgezahlt', ausgezahlt_von = auth.uid(), ausgezahlt_am = now() where id = p_id;
  update reise set vorschuss_cent = v.betrag_cent where id = v.reise_id;
end;
$$;

-- 3) Vier-Augen-Prinzip: Reisen von Admin UND Buchhaltung darf die genehmigende Person auch prüfen
--    (es gibt nur eine Buchhaltung; deren eigene Reisen prüft sonst niemand)
create or replace function reise_pruefen(p_id uuid, p_buchungsmonat date) returns text
  language plpgsql security definer set search_path = public as $$
declare r reise; reisende_rolle rolle; jahr text; nr text;
begin
  r := reise_holen(p_id);
  if r.status <> 'freigegeben' then raise exception 'Reise ist nicht genehmigt'; end if;
  if not darf_pruefen(r.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Belegprüfung'; end if;
  if p_buchungsmonat is null then raise exception 'Bitte den Buchungsmonat angeben'; end if;

  select rolle into reisende_rolle from profile where id = r.mitarbeiter_id;
  if r.freigeber_id = auth.uid() and reisende_rolle not in ('admin', 'buchhaltung') then
    raise exception 'Genehmigung und Belegprüfung müssen von verschiedenen Personen kommen';
  end if;

  -- Fortlaufend je Jahr des Buchungsmonats; Sperre verhindert doppelte Nummern bei gleichzeitiger Prüfung
  jahr := to_char(p_buchungsmonat, 'YYYY');
  perform pg_advisory_xact_lock(hashtext('beleg_nr_' || jahr));
  select 'RK-' || jahr || '-' || lpad((coalesce(max(split_part(beleg_nr, '-', 3)::int), 0) + 1)::text, 4, '0')
    into nr from reise where beleg_nr ~ ('^RK-' || jahr || '-\d{4}$');

  update reise set status = 'geprueft', beleg_nr = nr,
    buchungsmonat = date_trunc('month', p_buchungsmonat)::date,
    geprueft_von = auth.uid(), geprueft_am = now()
   where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion, kommentar) values (p_id, auth.uid(), 'geprueft', nr);
  return nr;
end;
$$;
