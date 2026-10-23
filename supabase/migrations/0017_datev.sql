-- #8: Interne Einstellungen, nur für Buchhaltung/Admin lesbar (z. B. DATEV-Upload-Mail-Adresse)
create table einstellungen_intern (
  id boolean primary key default true check (id),
  datev_upload_mail text check (datev_upload_mail is null or datev_upload_mail ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  updated_at timestamptz not null default now()
);
insert into einstellungen_intern default values;

alter table einstellungen_intern enable row level security;
create policy "Buchhaltung liest interne Einstellungen" on einstellungen_intern for select using (ist_buchhaltung());
create policy "Buchhaltung ändert interne Einstellungen" on einstellungen_intern for update
  using (ist_buchhaltung()) with check (ist_buchhaltung());

-- Mailprotokoll: Reisende sehen den DATEV-Status ihrer eigenen Reisen nicht, Buchhaltung schon (bestehende Policy)
