-- Legt beim ersten Login automatisch ein Profil mit Rolle "mitarbeiter" an.

create function public.profil_anlegen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profile (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger profil_bei_registrierung
  after insert on auth.users
  for each row execute function public.profil_anlegen();

create policy "eigenes Profil bearbeiten" on profile for update
  using (id = auth.uid())
  with check (id = auth.uid() and rolle = (select p.rolle from profile p where p.id = auth.uid()));
