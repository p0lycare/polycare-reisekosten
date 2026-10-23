-- Voller Name aus Microsoft übernehmen.
-- Der Name kommt nur mit dem Scope "profile"; Supabase aktualisiert die Metadaten bei jedem Login.
-- Bestehende Profile mit dem Ersatznamen (Teil der E-Mail vor dem @) werden beim nächsten Login korrigiert,
-- manuell geänderte Namen bleiben unangetastet.

create function public.name_aus_metadaten(meta jsonb, email text) returns text
  language sql immutable as $$
  select coalesce(
    nullif(meta ->> 'full_name', ''),
    nullif(meta ->> 'name', ''),
    nullif(meta -> 'custom_claims' ->> 'name', ''),
    split_part(email, '@', 1)
  );
$$;

create or replace function public.profil_anlegen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profile (id, name, email)
  values (new.id, name_aus_metadaten(new.raw_user_meta_data, new.email), new.email);
  return new;
end;
$$;

create function public.profil_name_aktualisieren() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update profile
     set name = name_aus_metadaten(new.raw_user_meta_data, new.email)
   where id = new.id
     and name = split_part(new.email, '@', 1);
  return new;
end;
$$;

create trigger profil_name_bei_login
  after update of raw_user_meta_data on auth.users
  for each row execute function public.profil_name_aktualisieren();
