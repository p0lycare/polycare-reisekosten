-- Projekte / Förderprojekte: optionale Zuordnung je Reise, Auswertung je Projekt und Zeitraum

create table projekt (
  id uuid primary key default gen_random_uuid(),
  bezeichnung text not null check (char_length(bezeichnung) between 1 and 120),
  -- Interne Projektnummer bzw. Kürzel
  nummer text check (nummer is null or char_length(nummer) <= 40),
  -- Bei Förderprojekten: Fördergeber und Förderkennzeichen für die Verwendungsnachweise
  foerdergeber text check (foerdergeber is null or char_length(foerdergeber) <= 120),
  foerderkennzeichen text check (foerderkennzeichen is null or char_length(foerderkennzeichen) <= 60),
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

alter table projekt enable row level security;
create policy "Projekte lesen" on projekt for select to authenticated using (true);
create policy "Buchhaltung legt Projekte an" on projekt for insert to authenticated with check (ist_buchhaltung());
create policy "Buchhaltung ändert Projekte" on projekt for update to authenticated using (ist_buchhaltung()) with check (ist_buchhaltung());

alter table reise add column projekt_id uuid references projekt on delete restrict;
create index on reise (projekt_id);
