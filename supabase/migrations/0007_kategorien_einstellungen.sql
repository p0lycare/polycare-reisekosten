-- #16: Kategorien mit MwSt-Satz und Buchungskonto sowie Km-Sätze, im Tool pflegbar.
-- Bezeichnungen und Standard-MwSt-Sätze folgen dem Formblatt FB 06.
-- Kontonummern werden bewusst NICHT hier eingetragen (öffentliches Repo), sondern im Tool gepflegt.

create table kategorie (
  id text primary key,
  abschnitt char(1) not null check (abschnitt in ('A', 'B', 'C', 'D', 'E', 'F')),
  bezeichnung text not null,
  -- null = Satz wird je Beleg gewählt ("bitte Steuersatz angeben")
  mwst_prozent numeric(4, 2) check (mwst_prozent >= 0 and mwst_prozent < 100),
  konto text,
  -- false für berechnete Positionen (Km-Geld, Verpflegung), die nicht als Beleg erfasst werden
  beleg_erfassbar boolean not null default true,
  aktiv boolean not null default true,
  sortierung integer not null default 0
);

insert into kategorie (id, abschnitt, bezeichnung, mwst_prozent, beleg_erfassbar, sortierung) values
  ('flug',                'A', 'Flugzeug',                         19,   true,  10),
  ('tanken',              'A', 'Auto tanken',                      19,   true,  20),
  ('parken_waschanlage',  'A', 'Parken/Waschanlage',               19,   true,  30),
  ('maut',                'A', 'Maut/Vignette',                     0,   true,  40),
  ('mietwagen',           'A', 'Mietwagen (selbst bezahlt)',       19,   true,  50),
  ('taxi',                'A', 'Taxi',                              7,   true,  60),
  ('bahn',                'A', 'Zugticket',                         7,   true,  70),
  ('km_geld',             'A', 'Km-Geld bei Privatwagen',        null,   false, 80),
  ('verpflegung',         'B', 'Verpflegungspauschale',          null,   false, 10),
  ('uebernachtung',       'C', 'Übernachtung',                      7,   true,  10),
  ('hotel_fruehstueck',   'C', 'Frühstück (Hotelrechnung)',        19,   true,  20),
  ('servicepauschale',    'C', 'Servicepauschale',                 19,   true,  30),
  ('beherbergungssteuer', 'C', 'Beherbergungssteuer',               0,   true,  40),
  ('hotel_parken',        'C', 'Parken (Hotel)',                 null,   true,  50),
  ('kurtaxe',             'C', 'Kurtaxe',                        null,   true,  60),
  ('hotel_sonstiges',     'C', 'Sonstiges (Hotel)',              null,   true,  70),
  ('bewirtung_19',        'E', 'Bewirtung mit 19 % MwSt',          19,   true,  10),
  ('bewirtung_7',         'E', 'Bewirtung mit 7 % MwSt',            7,   true,  20),
  ('telefon_porto',       'F', 'Telefon, Porto inkl. MwSt',        19,   true,  10),
  ('telefon_porto_ohne',  'F', 'Telefon, Porto ohne MwSt',          0,   true,  20),
  ('trinkgeld',           'F', 'Trinkgeld ohne MwSt',               0,   true,  30),
  ('parken_ohne',         'F', 'Parken ohne MwSt',                  0,   true,  40),
  ('buerobedarf',         'F', 'Bürobedarf',                       19,   true,  50);

-- Genau eine Zeile mit den globalen Sätzen
create table einstellungen (
  id boolean primary key default true check (id),
  km_satz_cent integer not null default 38 check (km_satz_cent >= 0),
  km_steuerfrei_cent integer not null default 30 check (km_steuerfrei_cent >= 0),
  updated_at timestamptz not null default now()
);
insert into einstellungen default values;

alter table kategorie enable row level security;
alter table einstellungen enable row level security;

create policy "Kategorien lesen" on kategorie for select to authenticated using (true);
create policy "Buchhaltung pflegt Kategorien" on kategorie for insert to authenticated with check (ist_buchhaltung());
create policy "Buchhaltung ändert Kategorien" on kategorie for update to authenticated using (ist_buchhaltung()) with check (ist_buchhaltung());

create policy "Einstellungen lesen" on einstellungen for select to authenticated using (true);
create policy "Buchhaltung ändert Einstellungen" on einstellungen for update to authenticated using (ist_buchhaltung()) with check (ist_buchhaltung());

-- Beleg auf Kategorien umstellen (Tabelle ist noch leer); Fahrten bekommen eine eigene Tabelle (#5)
alter table beleg
  drop column art,
  drop column mwst_cent,
  drop column km,
  add column kategorie_id text not null references kategorie,
  add column mwst_prozent numeric(4, 2) not null check (mwst_prozent >= 0 and mwst_prozent < 100);
drop type beleg_art;
