-- Sicherheits-Audit 25.10.2026

-- 1) Funktionen nicht für nicht angemeldete Aufrufe: Postgres/Supabase erlauben EXECUTE standardmäßig
--    für PUBLIC und anon. Angemeldete Nutzer und die Service-Rolle behalten ihre Rechte.
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon;
grant execute on all functions in schema public to authenticated;
-- Interne Helfer bleiben nur für die Service-Rolle bzw. die Funktionen selbst
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('reise_holen', 'vorschuss_holen', 'mail_empfaenger', 'mail_protokollieren')
  loop
    execute format('revoke execute on function %s from authenticated', f);
  end loop;
end;
$$;

-- 2) Vorschuss-Funktionen NULL-sicher (auth.uid() ist ohne Anmeldung NULL)
create or replace function vorschuss_beantragen(p_reise uuid, p_betrag_cent integer, p_grund text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare r reise; neu uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into r from reise where id = p_reise;
  if not found or r.mitarbeiter_id is distinct from auth.uid() then raise exception 'Reise nicht gefunden'; end if;
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

create or replace function vorschuss_zurueckziehen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare v vorschuss;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  v := vorschuss_holen(p_id);
  if v.mitarbeiter_id is distinct from auth.uid() or v.status <> 'beantragt' then
    raise exception 'Nur ein noch nicht genehmigter eigener Antrag kann zurückgezogen werden';
  end if;
  delete from vorschuss where id = p_id;
end;
$$;

-- Vorschüsse sehen: eigene, die man genehmigen darf, und die Buchhaltung
drop policy "Vorschüsse lesen" on vorschuss;
create policy "Vorschüsse lesen" on vorschuss for select to authenticated
  using (mitarbeiter_id = auth.uid() or darf_genehmigen(mitarbeiter_id) or ist_buchhaltung());

-- 3) Belegpfade: eine Belegzeile darf nur auf Dateien im Ordner der reisenden Person zeigen
create function beleg_pfad_pruefen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.datei_pfad is not null
     and split_part(new.datei_pfad, '/', 1) is distinct from (select mitarbeiter_id::text from reise where id = new.reise_id) then
    raise exception 'Ungültiger Dateipfad für diesen Beleg';
  end if;
  return new;
end;
$$;
create trigger beleg_pfad_pruefen before insert or update of datei_pfad, reise_id on beleg
  for each row execute function beleg_pfad_pruefen();

-- Lesen über einen Beleg nur, wenn die Datei im Ordner der reisenden Person liegt (zusätzliche Absicherung)
drop policy "Belegfotos lesen" on storage.objects;
create policy "Belegfotos lesen" on storage.objects for select
  using (
    bucket_id = 'belege'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.beleg b join public.reise r on r.id = b.reise_id
         where b.datei_pfad = name
           and (storage.foldername(name))[1] = r.mitarbeiter_id::text
           and public.darf_reise_sehen(b.reise_id)
      )
    )
  );

-- 4) Berechnete Route nur vom Server: direkte Änderungen durch Nutzer setzen sie nicht bzw. verwerfen sie
create function fahrt_route_schuetzen() returns trigger
  language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.km_route := null;
  elsif new.strecke is distinct from old.strecke then
    new.km_route := null;
  else
    new.km_route := old.km_route;
  end if;
  return new;
end;
$$;
create trigger fahrt_route_schuetzen before insert or update on fahrt
  for each row execute function fahrt_route_schuetzen();
