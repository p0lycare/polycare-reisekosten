-- Pflichtangaben je Beleg, damit ein fremder Dritter (Betriebsprüfung) jede Ausgabe nachvollziehen kann:
-- Hotel → wer hat übernachtet und warum, Tanken → Kfz-Kennzeichen, Mietwagen → Anlass der Fahrt.
-- Bewirtung (Anlass, bewirtete Personen) und Auslagen (Zweck) sind bereits Pflicht.

alter table beleg add column anlass text check (anlass is null or char_length(anlass) <= 300);
alter table beleg add column person text check (person is null or char_length(person) <= 200);
alter table beleg add column kfz_kennzeichen text check (kfz_kennzeichen is null or char_length(kfz_kennzeichen) <= 20);

-- Welche Angaben eine Kategorie verlangt; pflegt die Buchhaltung in den Einstellungen
alter table kategorie add column pflichtangaben text[] not null default '{}'
  check (pflichtangaben <@ array['anlass', 'person', 'kfz']::text[]);

update kategorie set pflichtangaben = array['person', 'anlass'] where abschnitt = 'C';
update kategorie set pflichtangaben = array['kfz'] where id = 'tanken';
update kategorie set pflichtangaben = array['anlass'] where id = 'mietwagen';
