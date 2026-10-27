-- Eigene DATEV-Upload-Mail-Adresse für Auslagen (in DATEV z. B. Belegtyp "Sonstige"); leer = Reisekosten-Adresse
alter table einstellungen_intern
  add column datev_upload_mail_auslagen text
  check (datev_upload_mail_auslagen is null or datev_upload_mail_auslagen ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
