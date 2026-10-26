-- Kalendervorschläge je Person: Fahrten innerhalb des eigenen Wohnorts und – bei Zuordnung zum Büro –
-- ins Büro sind keine Reise. Wer von woanders ins Büro kommt, bekommt die Fahrt als Reise vorgeschlagen.

-- Erste Tätigkeitsstätte = Büro (Regelfall); nur Admins ändern das (steuerlich relevant)
alter table profile add column buero_ist_taetigkeitsstaette boolean not null default true;

create or replace function profil_schuetzen() returns trigger
  language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') or ist_admin() then return new; end if;
  if (new.rolle, new.vorgesetzter_id, new.name, new.email, new.buero_ist_taetigkeitsstaette)
     is distinct from (old.rolle, old.vorgesetzter_id, old.name, old.email, old.buero_ist_taetigkeitsstaette) then
    raise exception 'Diese Profilfelder kann nur ein Admin ändern';
  end if;
  return new;
end;
$$;

-- Büro-Orte = nur noch die Büroadresse, nicht die ganze Stadt (die Stadt kommt je Person aus dem Wohnort)
update einstellungen set buero_orte = array['Rheingasse 14', 'Heumarkt'], updated_at = now();

-- Ausgeblendete Kalendervorschläge (× auf der Monatsseite); nur die eigene Person sieht und ändert sie
create table kalender_ausgeblendet (
  person_id uuid not null references profile on delete cascade default auth.uid(),
  termin_id text not null check (char_length(termin_id) <= 500),
  erstellt_am timestamptz not null default now(),
  primary key (person_id, termin_id)
);
alter table kalender_ausgeblendet enable row level security;
create policy "eigene ausgeblendete Vorschläge" on kalender_ausgeblendet for all to authenticated
  using (person_id = auth.uid()) with check (person_id = auth.uid());
