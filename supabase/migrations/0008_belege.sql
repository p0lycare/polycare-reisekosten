-- #4: Belege mit Foto

-- Bewirtung (Abschnitt E): Angaben für den Betriebsausgabenabzug
alter table beleg
  add column bewirtung_anlass text,
  add column bewirtung_teilnehmer text;

-- Belegfotos: max. 10 MB, nur Bilder und PDF
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
 where id = 'belege';

-- Eigene Belegdateien dürfen nur gelöscht werden, solange die Reise bearbeitbar ist.
-- Pfad: <user_id>/<reise_id>/<datei>
create policy "eigene Belege löschen" on storage.objects for delete
  using (
    bucket_id = 'belege'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.reise r
       where r.id::text = (storage.foldername(name))[2]
         and r.mitarbeiter_id = auth.uid()
         and r.status in ('entwurf', 'abgelehnt')
    )
  );

-- Hochladen ebenfalls nur in eigene, bearbeitbare Reisen
drop policy "eigene Belege hochladen" on storage.objects;
create policy "eigene Belege hochladen" on storage.objects for insert
  with check (
    bucket_id = 'belege'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.reise r
       where r.id::text = (storage.foldername(name))[2]
         and r.mitarbeiter_id = auth.uid()
         and r.status in ('entwurf', 'abgelehnt')
    )
  );
