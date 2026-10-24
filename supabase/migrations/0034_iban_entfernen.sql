-- Auszahlung läuft als eigene Überweisung über DATEV (Bankverbindungen sind dort hinterlegt).
-- Das Tool speichert keine Kontodaten mehr.
alter table profil_privat drop column iban;
