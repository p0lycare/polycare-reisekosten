-- Fehler, Wünsche und Fragen aus dem Tool. Bleiben in der Datenbank (nicht im öffentlichen Repo),
-- sichtbar für die meldende Person und Admins.

create table meldung (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references profile default auth.uid(),
  art text not null check (art in ('fehler', 'wunsch', 'frage')),
  text text not null check (char_length(text) between 3 and 4000),
  seite text check (seite is null or char_length(seite) <= 300),
  browser text check (browser is null or char_length(browser) <= 300),
  status text not null default 'offen' check (status in ('offen', 'in_arbeit', 'erledigt')),
  notiz text check (notiz is null or char_length(notiz) <= 2000),
  erstellt_am timestamptz not null default now()
);
create index on meldung (status, erstellt_am desc);

alter table meldung enable row level security;
create policy "Meldungen lesen" on meldung for select to authenticated
  using (person_id = auth.uid() or ist_admin());
create policy "Meldung abgeben" on meldung for insert to authenticated
  with check (person_id = auth.uid() and status = 'offen' and notiz is null);
create policy "Admins bearbeiten Meldungen" on meldung for update to authenticated
  using (ist_admin()) with check (ist_admin());
