-- Mitarbeitende dürfen eigene Entwürfe löschen.
create policy "eigene Entwürfe löschen" on reise for delete
  using (mitarbeiter_id = auth.uid() and status = 'entwurf');
