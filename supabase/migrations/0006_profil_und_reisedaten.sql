-- Formblatt FB 06: Stammdaten im Profil (#13) und Reisedaten (#14)

-- Vertrauliche Stammdaten in eigener Tabelle, damit Freigebende sie nicht lesen können
create table profil_privat (
  id uuid primary key references profile on delete cascade,
  personalnummer text,
  wohnort text,
  iban text check (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  updated_at timestamptz not null default now()
);

insert into profil_privat (id, personalnummer)
  select id, personalnummer from profile where personalnummer is not null;
alter table profile drop column personalnummer;
alter table profile add column kfz_kennzeichen text;

create function ist_buchhaltung() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from profile where id = auth.uid() and rolle in ('buchhaltung', 'admin'));
$$;

-- Buchhaltung muss alle Reisen und Profile sehen, um Belege zu prüfen
create or replace function ist_freigeber() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from profile where id = auth.uid() and rolle in ('freigeber', 'buchhaltung', 'admin'));
$$;

alter table profil_privat enable row level security;

create policy "eigene Stammdaten oder Buchhaltung lesen" on profil_privat for select
  using (id = auth.uid() or ist_buchhaltung());
create policy "eigene Stammdaten anlegen" on profil_privat for insert
  with check (id = auth.uid());
create policy "eigene Stammdaten bearbeiten" on profil_privat for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Reise: Felder wie im Formblatt
create type verkehrsmittel as enum ('flugzeug', 'eisenbahn', 'firmenwagen', 'eigener_pkw', 'mitfahrt', 'mietwagen');

alter table reise rename column anlass to begruendung;
alter table reise rename column ziel to reiseweg;
alter table reise
  add column besuchte_stellen text,
  add column verkehrsmittel verkehrsmittel[] not null default '{}',
  add column kfz_kennzeichen text,
  add column mitfahrt_bei text,
  add column kostenstelle text,
  add column verpflegung_bemerkung text;
