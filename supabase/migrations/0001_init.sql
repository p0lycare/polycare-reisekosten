-- Grundschema Reisekosten (Supabase / Postgres)

create type rolle as enum ('mitarbeiter', 'freigeber', 'admin');
create type reise_status as enum ('entwurf', 'eingereicht', 'freigegeben', 'abgelehnt', 'ausgezahlt');
create type beleg_art as enum ('fahrt', 'uebernachtung', 'bewirtung', 'oepnv', 'flug', 'bahn', 'sonstiges');

create table profile (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text not null,
  rolle rolle not null default 'mitarbeiter',
  personalnummer text,
  kostenstelle text,
  created_at timestamptz not null default now()
);

create table reise (
  id uuid primary key default gen_random_uuid(),
  mitarbeiter_id uuid not null references profile on delete restrict,
  anlass text not null,
  ziel text not null,
  land char(2) not null default 'DE',
  beginn timestamp not null,
  ende timestamp not null,
  mit_uebernachtung boolean not null default true,
  -- gestellte Mahlzeiten je Tag: {"2026-10-22": {"fruehstueck": true}}
  mahlzeiten jsonb not null default '{}',
  status reise_status not null default 'entwurf',
  freigeber_id uuid references profile,
  freigegeben_am timestamptz,
  ablehnungsgrund text,
  created_at timestamptz not null default now(),
  check (ende > beginn)
);

create table beleg (
  id uuid primary key default gen_random_uuid(),
  reise_id uuid not null references reise on delete cascade,
  art beleg_art not null,
  datum date not null,
  beschreibung text,
  betrag_cent integer not null check (betrag_cent >= 0),
  waehrung char(3) not null default 'EUR',
  mwst_cent integer,
  km numeric(8, 1),            -- nur bei art = 'fahrt' mit Privatfahrzeug
  datei_pfad text,             -- Storage-Bucket "belege"
  created_at timestamptz not null default now()
);

create index on reise (mitarbeiter_id);
create index on reise (status);
create index on beleg (reise_id);

-- Row Level Security
alter table profile enable row level security;
alter table reise enable row level security;
alter table beleg enable row level security;

create function ist_freigeber() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from profile where id = auth.uid() and rolle in ('freigeber', 'admin'));
$$;

create policy "eigenes Profil oder Freigeber" on profile for select
  using (id = auth.uid() or ist_freigeber());

create policy "eigene Reisen lesen, Freigeber alle" on reise for select
  using (mitarbeiter_id = auth.uid() or ist_freigeber());
create policy "eigene Reisen anlegen" on reise for insert
  with check (mitarbeiter_id = auth.uid());
create policy "eigene Entwürfe bearbeiten" on reise for update
  using (mitarbeiter_id = auth.uid() and status in ('entwurf', 'abgelehnt'));
create policy "Freigeber entscheiden" on reise for update
  using (ist_freigeber() and status = 'eingereicht');

create policy "Belege eigener Reisen lesen" on beleg for select
  using (exists (select 1 from reise r where r.id = reise_id
                 and (r.mitarbeiter_id = auth.uid() or ist_freigeber())));
create policy "Belege in eigenen Entwürfen pflegen" on beleg for all
  using (exists (select 1 from reise r where r.id = reise_id
                 and r.mitarbeiter_id = auth.uid() and r.status in ('entwurf', 'abgelehnt')));

-- Privater Bucket für Belegfotos; Pfad: <user_id>/<reise_id>/<datei>
insert into storage.buckets (id, name, public) values ('belege', 'belege', false);

create policy "eigene Belege hochladen" on storage.objects for insert
  with check (bucket_id = 'belege' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Belege lesen" on storage.objects for select
  using (bucket_id = 'belege' and ((storage.foldername(name))[1] = auth.uid()::text or ist_freigeber()));
