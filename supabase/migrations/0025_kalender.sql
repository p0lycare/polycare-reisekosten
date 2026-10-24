-- Reisevorschläge aus dem Outlook-Kalender: Zustimmung je Person, Büro-Orte zum Ausfiltern

alter table profile add column kalender_vorschlaege boolean not null default false;

-- Orte der ersten Tätigkeitsstätte (Teiltexte, z. B. Straße oder Ort); Termine dort sind keine Dienstreise
alter table einstellungen add column buero_orte text[] not null default '{}';
