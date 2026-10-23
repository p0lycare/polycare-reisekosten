-- Sicherheitskorrekturen aus dem Review

-- 1) Nur Microsoft-Konten (Single-Tenant-App, also nur Polycare) dürfen ein Konto bekommen.
--    Zweite Sicherung neben der deaktivierten E-Mail-Registrierung.
create or replace function public.profil_anlegen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', '') <> 'azure' then
    raise exception 'Anmeldung nur mit dem Polycare-Microsoft-Konto möglich';
  end if;
  insert into profile (id, name, email)
  values (new.id, split_part(new.email, '@', 1), new.email);
  return new;
end;
$$;

-- 2) Den Namen nur aus der Microsoft-Identität übernehmen (vom Anbieter gesetzt), nicht aus den
--    Benutzer-Metadaten, die jede Person selbst ändern kann.
drop trigger if exists profil_name_bei_login on auth.users;
drop function if exists public.profil_name_aktualisieren();

create function public.profil_name_aus_identitaet() returns trigger
  language plpgsql security definer set search_path = public as $$
declare neuer_name text;
begin
  if new.provider <> 'azure' then return new; end if;
  neuer_name := nullif(coalesce(new.identity_data ->> 'full_name', new.identity_data ->> 'name'), '');
  if neuer_name is null then return new; end if;
  -- Nur den Ersatznamen ersetzen; von Admins geänderte Namen bleiben
  update profile p set name = neuer_name
   where p.id = new.user_id and p.name = split_part(p.email, '@', 1);
  return new;
end;
$$;

create trigger profil_name_aus_identitaet
  after insert or update of identity_data on auth.identities
  for each row execute function public.profil_name_aus_identitaet();

-- 3) Sichtbarkeit: Reisende sehen ihre eigenen Reisen, die Buchhaltung alle; Führungskräfte nur
--    eingereichte Reisen, die sie genehmigen dürfen oder genehmigt haben – keine Entwürfe.
create function darf_reise_sehen(p_reise uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from reise r
     where r.id = p_reise
       and (r.mitarbeiter_id = auth.uid()
            or ist_buchhaltung()
            or (r.status <> 'entwurf' and (r.freigeber_id = auth.uid() or darf_genehmigen(r.mitarbeiter_id))))
  );
$$;

drop policy "eigene Reisen lesen, Freigeber alle" on reise;
create policy "Reisen lesen" on reise for select using (darf_reise_sehen(id));

drop policy "Belege eigener Reisen lesen" on beleg;
create policy "Belege lesen" on beleg for select using (darf_reise_sehen(reise_id));

drop policy "Fahrten eigener Reisen lesen" on fahrt;
create policy "Fahrten lesen" on fahrt for select using (darf_reise_sehen(reise_id));

drop policy "Verlauf lesen wie Reise" on reise_ereignis;
create policy "Verlauf lesen" on reise_ereignis for select using (darf_reise_sehen(reise_id));

-- Belegfotos: Pfad <user_id>/<reise_id>/<datei>
drop policy "Belege lesen" on storage.objects;
create policy "Belegfotos lesen" on storage.objects for select
  using (
    bucket_id = 'belege'
    and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
    and public.darf_reise_sehen(((storage.foldername(name))[2])::uuid)
  );

-- Belegfotos nur löschen, solange die Reise ein Entwurf oder abgelehnt ist – und nur, wenn kein
-- Beleg mehr darauf verweist (sonst blieben Belege ohne Foto zurück)
drop policy "eigene Belege löschen" on storage.objects;
create policy "eigene Belege löschen" on storage.objects for delete
  using (
    bucket_id = 'belege'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.reise r
       where r.id::text = (storage.foldername(name))[2]
         and r.mitarbeiter_id = auth.uid()
         and r.status in ('entwurf', 'abgelehnt')
    )
    and not exists (select 1 from public.beleg b where b.datei_pfad = name)
  );

-- 4) Mailprotokoll und Empfängerermittlung nur noch serverseitig (Service-Rolle), nicht aus dem Browser
revoke execute on function mail_protokollieren(uuid, text, text[], text, text, text) from public, anon, authenticated;
revoke execute on function mail_empfaenger(uuid, text) from public, anon, authenticated;

-- Empfänger ohne auth.uid()-Prüfung (Aufruf nur noch durch den Server nach erfolgreichem Workflow-Schritt)
create or replace function mail_empfaenger(p_reise uuid, p_art text) returns table (email text)
  language plpgsql stable security definer set search_path = public as $$
declare r reise; ma profile;
begin
  select * into r from reise where id = p_reise;
  if not found then return; end if;
  select * into ma from profile where id = r.mitarbeiter_id;

  if p_art = 'eingereicht' then
    if ma.vorgesetzter_id is not null then
      return query select p.email from profile p where p.id = ma.vorgesetzter_id;
    else
      return query select p.email from profile p where p.rolle in ('freigeber', 'admin') and p.id <> ma.id;
    end if;
  elsif p_art = 'genehmigt' then
    return query select p.email from profile p where p.rolle = 'buchhaltung' and p.id <> ma.id;
    if not found then
      return query select p.email from profile p where p.rolle = 'admin' and p.id <> ma.id;
    end if;
  elsif p_art in ('abgelehnt', 'geprueft', 'ausgezahlt') then
    return query select ma.email;
  end if;
end;
$$;
revoke execute on function mail_empfaenger(uuid, text) from public, anon, authenticated;

create or replace function mail_protokollieren(p_reise uuid, p_art text, p_an text[], p_betreff text, p_status text, p_fehler text,
  p_person uuid default null)
  returns void
  language sql security definer set search_path = public as $$
  insert into mail_protokoll (reise_id, art, an, betreff, status, fehler, ausgeloest_von)
  values (p_reise, p_art, coalesce(p_an, '{}'), p_betreff, p_status, left(p_fehler, 500), p_person);
$$;
revoke execute on function mail_protokollieren(uuid, text, text[], text, text, text, uuid) from public, anon, authenticated;
drop function mail_protokollieren(uuid, text, text[], text, text, text);
