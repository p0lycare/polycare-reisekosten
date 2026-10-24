-- #25: Vorschuss beantragen → Führungskraft genehmigt → Buchhaltung zahlt aus → Betrag steht fest in der Reise

create type vorschuss_status as enum ('beantragt', 'genehmigt', 'abgelehnt', 'ausgezahlt');

create table vorschuss (
  id uuid primary key default gen_random_uuid(),
  reise_id uuid not null references reise on delete cascade,
  mitarbeiter_id uuid not null references profile,
  betrag_cent integer not null check (betrag_cent > 0 and betrag_cent <= 500000),
  grund text check (grund is null or char_length(grund) <= 300),
  -- Angaben zur Reise beim Antrag: Führungskräfte sehen fremde Entwürfe sonst nicht
  reise_anlass text not null,
  reise_weg text not null,
  reise_beginn timestamp not null,
  status vorschuss_status not null default 'beantragt',
  beantragt_am timestamptz not null default now(),
  entschieden_von uuid references profile,
  entschieden_am timestamptz,
  ablehnungsgrund text,
  ausgezahlt_von uuid references profile,
  ausgezahlt_am timestamptz
);
create index on vorschuss (reise_id);
-- Höchstens ein laufender oder ausgezahlter Vorschuss je Reise
create unique index vorschuss_einer_je_reise on vorschuss (reise_id) where status <> 'abgelehnt';

alter table vorschuss enable row level security;
create policy "Vorschüsse lesen" on vorschuss for select to authenticated
  using (mitarbeiter_id = auth.uid() or ist_freigeber());
-- Keine direkten Schreibrechte: nur über die Funktionen unten

create function vorschuss_holen(p_id uuid) returns vorschuss
  language plpgsql stable security definer set search_path = public as $$
declare v vorschuss;
begin
  select * into v from vorschuss where id = p_id for update;
  if not found then raise exception 'Vorschuss nicht gefunden'; end if;
  return v;
end;
$$;

create function vorschuss_beantragen(p_reise uuid, p_betrag_cent integer, p_grund text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare r reise; neu uuid;
begin
  select * into r from reise where id = p_reise;
  if not found or r.mitarbeiter_id <> auth.uid() then raise exception 'Reise nicht gefunden'; end if;
  if r.status <> 'entwurf' then raise exception 'Ein Vorschuss kann nur vor dem Einreichen beantragt werden'; end if;
  if p_betrag_cent is null or p_betrag_cent <= 0 or p_betrag_cent > 500000 then
    raise exception 'Bitte einen Betrag zwischen 0,01 € und 5.000 € angeben';
  end if;
  if exists (select 1 from vorschuss where reise_id = p_reise and status <> 'abgelehnt') then
    raise exception 'Für diese Reise gibt es bereits einen Vorschuss';
  end if;
  insert into vorschuss (reise_id, mitarbeiter_id, betrag_cent, grund, reise_anlass, reise_weg, reise_beginn)
  values (p_reise, auth.uid(), p_betrag_cent, nullif(left(trim(coalesce(p_grund, '')), 300), ''),
          r.begruendung, r.reiseweg, r.beginn)
  returning id into neu;
  return neu;
end;
$$;

create function vorschuss_zurueckziehen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare v vorschuss;
begin
  v := vorschuss_holen(p_id);
  if v.mitarbeiter_id <> auth.uid() or v.status <> 'beantragt' then
    raise exception 'Nur ein noch nicht genehmigter eigener Antrag kann zurückgezogen werden';
  end if;
  delete from vorschuss where id = p_id;
end;
$$;

create function vorschuss_genehmigen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare v vorschuss;
begin
  v := vorschuss_holen(p_id);
  if v.status <> 'beantragt' then raise exception 'Der Vorschuss wartet nicht auf Genehmigung'; end if;
  if not darf_genehmigen(v.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Genehmigung'; end if;
  update vorschuss set status = 'genehmigt', entschieden_von = auth.uid(), entschieden_am = now() where id = p_id;
end;
$$;

create function vorschuss_ablehnen(p_id uuid, p_grund text) returns void
  language plpgsql security definer set search_path = public as $$
declare v vorschuss;
begin
  v := vorschuss_holen(p_id);
  if coalesce(trim(p_grund), '') = '' then raise exception 'Bitte einen Grund angeben'; end if;
  if not ((v.status = 'beantragt' and darf_genehmigen(v.mitarbeiter_id))
       or (v.status = 'genehmigt' and darf_pruefen(v.mitarbeiter_id))) then
    raise exception 'Keine Berechtigung zur Ablehnung';
  end if;
  update vorschuss set status = 'abgelehnt', ablehnungsgrund = left(trim(p_grund), 300),
    entschieden_von = auth.uid(), entschieden_am = now() where id = p_id;
end;
$$;

create function vorschuss_auszahlen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare v vorschuss;
begin
  v := vorschuss_holen(p_id);
  if v.status <> 'genehmigt' then raise exception 'Der Vorschuss ist nicht genehmigt'; end if;
  if not darf_pruefen(v.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Auszahlung'; end if;
  update vorschuss set status = 'ausgezahlt', ausgezahlt_von = auth.uid(), ausgezahlt_am = now() where id = p_id;
  -- Der Trigger unten schreibt den Betrag in die Reise
  update reise set vorschuss_cent = v.betrag_cent where id = v.reise_id;
end;
$$;

revoke execute on function vorschuss_holen(uuid) from public, anon, authenticated;
grant execute on function vorschuss_beantragen(uuid, integer, text), vorschuss_zurueckziehen(uuid), vorschuss_genehmigen(uuid),
  vorschuss_ablehnen(uuid, text), vorschuss_auszahlen(uuid) to authenticated;

-- Ausgezahlter Vorschuss steht fest: die Reise übernimmt immer diesen Betrag
create function reise_vorschuss_festhalten() returns trigger
  language plpgsql security definer set search_path = public as $$
declare betrag integer;
begin
  select v.betrag_cent into betrag from vorschuss v where v.reise_id = new.id and v.status = 'ausgezahlt';
  if found then new.vorschuss_cent := betrag; end if;
  return new;
end;
$$;
create trigger reise_vorschuss_festhalten before update on reise
  for each row execute function reise_vorschuss_festhalten();

-- Reisen mit ausgezahltem Vorschuss dürfen nicht gelöscht werden (sonst ginge der Vorschuss verloren)
create function reise_loeschen_mit_vorschuss() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from vorschuss where reise_id = old.id and status = 'ausgezahlt') then
    raise exception 'Zu dieser Reise wurde ein Vorschuss ausgezahlt – sie kann nicht gelöscht werden';
  end if;
  return old;
end;
$$;
create trigger reise_loeschen_mit_vorschuss before delete on reise
  for each row execute function reise_loeschen_mit_vorschuss();
