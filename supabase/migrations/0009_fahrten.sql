-- #5: Fahrten mit dem privaten PKW (Blatt "Fahrten" im Formblatt FB 06)
create table fahrt (
  id uuid primary key default gen_random_uuid(),
  reise_id uuid not null references reise on delete cascade,
  datum date not null,
  strecke text not null,
  zweck text,
  km numeric(7, 1) not null check (km > 0 and km < 10000),
  created_at timestamptz not null default now()
);
create index on fahrt (reise_id);

alter table fahrt enable row level security;

create policy "Fahrten eigener Reisen lesen" on fahrt for select
  using (exists (select 1 from reise r where r.id = reise_id
                 and (r.mitarbeiter_id = auth.uid() or ist_freigeber())));
create policy "Fahrten in eigenen Entwürfen pflegen" on fahrt for all
  using (exists (select 1 from reise r where r.id = reise_id
                 and r.mitarbeiter_id = auth.uid() and r.status in ('entwurf', 'abgelehnt')))
  with check (exists (select 1 from reise r where r.id = reise_id
                 and r.mitarbeiter_id = auth.uid() and r.status in ('entwurf', 'abgelehnt')));
