-- Robustheit aus dem Review

-- 1) Belegprüfung: Vier-Augen-Prinzip und fest vergebene, fortlaufende Beleg-Nr.
--    Genehmigung und Prüfung durch dieselbe Person nur bei Reisen der Geschäftsführung (Rolle admin),
--    da dort niemand anderes prüfen kann.
drop function if exists reise_pruefen(uuid, text, date);
drop function if exists naechste_beleg_nr();

create function reise_pruefen(p_id uuid, p_buchungsmonat date) returns text
  language plpgsql security definer set search_path = public as $$
declare r reise; reisende_rolle rolle; jahr text; nr text;
begin
  r := reise_holen(p_id);
  if r.status <> 'freigegeben' then raise exception 'Reise ist nicht genehmigt'; end if;
  if not darf_pruefen(r.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Belegprüfung'; end if;
  if p_buchungsmonat is null then raise exception 'Bitte den Buchungsmonat angeben'; end if;

  select rolle into reisende_rolle from profile where id = r.mitarbeiter_id;
  if r.freigeber_id = auth.uid() and reisende_rolle <> 'admin' then
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

alter table reise add constraint beleg_nr_format check (beleg_nr is null or beleg_nr ~ '^RK-\d{4}-\d{4}$');

-- 2) Kontingent für das KI-Auslesen (Kostenschutz): höchstens 60 Belege pro Person und Tag
create table ki_nutzung (
  id bigint generated always as identity primary key,
  person_id uuid not null references profile on delete cascade,
  zeit timestamptz not null default now()
);
create index on ki_nutzung (person_id, zeit);
alter table ki_nutzung enable row level security;
-- keine direkten Zugriffe; nur über die Funktion

create function ki_kontingent_nutzen() returns boolean
  language plpgsql security definer set search_path = public as $$
declare anzahl int;
begin
  if auth.uid() is null then return false; end if;
  select count(*) into anzahl from ki_nutzung where person_id = auth.uid() and zeit > now() - interval '1 day';
  if anzahl >= 60 then return false; end if;
  insert into ki_nutzung (person_id) values (auth.uid());
  return true;
end;
$$;

-- 3) Belegdateien höchstens 2,8 MB, damit jede Datei in eine Mail an DATEV passt
update storage.buckets set file_size_limit = 2800000 where id = 'belege';
