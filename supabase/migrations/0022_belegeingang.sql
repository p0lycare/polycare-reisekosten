-- Paket A: Belegeingang – Belege unterwegs fotografieren, später einer Reise zuordnen.
-- Fotos im Eingang liegen unter <user_id>/eingang/<datei>.

create table beleg_eingang (
  id uuid primary key default gen_random_uuid(),
  mitarbeiter_id uuid not null default auth.uid() references profile on delete cascade,
  datei_pfad text not null unique,
  -- Ergebnis des KI-Auslesens (AusgelesenerBeleg) oder null, wenn nicht ausgelesen
  ki_ergebnis jsonb,
  ki_fehler text,
  created_at timestamptz not null default now()
);
create index on beleg_eingang (mitarbeiter_id);

alter table beleg_eingang enable row level security;
create policy "eigener Belegeingang" on beleg_eingang for all
  using (mitarbeiter_id = auth.uid())
  with check (mitarbeiter_id = auth.uid() and datei_pfad like auth.uid()::text || '/eingang/%');

-- Speicherregeln neu: Lesen über den Beleg (Pfad sagt nicht mehr zwingend, zu welcher Reise er gehört)
drop policy "Belegfotos lesen" on storage.objects;
create policy "Belegfotos lesen" on storage.objects for select
  using (
    bucket_id = 'belege'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.beleg b where b.datei_pfad = name and public.darf_reise_sehen(b.reise_id))
    )
  );

drop policy "eigene Belege hochladen" on storage.objects;
create policy "eigene Belege hochladen" on storage.objects for insert
  with check (
    bucket_id = 'belege'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      (storage.foldername(name))[2] = 'eingang'
      or exists (
        select 1 from public.reise r
         where r.id::text = (storage.foldername(name))[2]
           and r.mitarbeiter_id = auth.uid()
           and r.status in ('entwurf', 'abgelehnt')
      )
    )
  );

drop policy "eigene Belege löschen" on storage.objects;
create policy "eigene Belege löschen" on storage.objects for delete
  using (
    bucket_id = 'belege'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.beleg b where b.datei_pfad = name)
    and not exists (select 1 from public.beleg_eingang e where e.datei_pfad = name)
    and (
      (storage.foldername(name))[2] = 'eingang'
      or exists (
        select 1 from public.reise r
         where r.id::text = (storage.foldername(name))[2]
           and r.mitarbeiter_id = auth.uid()
           and r.status in ('entwurf', 'abgelehnt')
      )
    )
  );
