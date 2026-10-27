-- Standorte statt eines einzigen Büros: je Person die erste Tätigkeitsstätte (oder keine).
-- Fahrten zum eigenen Standort sind keine Reise, Fahrten zu anderen Standorten schon.

create table standort (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  -- Adresse bzw. Suchbegriffe, an denen Kalendertermine den Standort erkennen
  orte text[] not null default '{}',
  aktiv boolean not null default true,
  sortierung integer not null default 0,
  created_at timestamptz not null default now()
);
alter table standort enable row level security;
create policy "Standorte lesen" on standort for select to authenticated using (true);
create policy "Buchhaltung legt Standorte an" on standort for insert to authenticated with check (ist_buchhaltung());
create policy "Buchhaltung ändert Standorte" on standort for update to authenticated using (ist_buchhaltung()) with check (ist_buchhaltung());

insert into standort (name, orte, sortierung) values
  ('Köln', array['Rheingasse 14', 'Heumarkt'], 10),
  ('Gehlberg (Hauptstandort)', array['Glasmacherstraße 11', '98528 Suhl', 'Gehlberg'], 20);

-- Erste Tätigkeitsstätte je Person; bisherige Büro-Zuordnung übernehmen (Haken gesetzt → Köln)
alter table profile add column erste_taetigkeitsstaette_id uuid references standort on delete set null;
update profile set erste_taetigkeitsstaette_id = (select id from standort where name = 'Köln')
 where buero_ist_taetigkeitsstaette;

create or replace function profil_schuetzen() returns trigger
  language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') or ist_admin() then return new; end if;
  if (new.rolle, new.vorgesetzter_id, new.name, new.email, new.buero_ist_taetigkeitsstaette, new.erste_taetigkeitsstaette_id)
     is distinct from (old.rolle, old.vorgesetzter_id, old.name, old.email, old.buero_ist_taetigkeitsstaette, old.erste_taetigkeitsstaette_id) then
    raise exception 'Diese Profilfelder kann nur ein Admin ändern';
  end if;
  return new;
end;
$$;
-- einstellungen.buero_orte und profile.buero_ist_taetigkeitsstaette werden nicht mehr genutzt
-- und nach dem Deploy in einer eigenen Migration entfernt.
