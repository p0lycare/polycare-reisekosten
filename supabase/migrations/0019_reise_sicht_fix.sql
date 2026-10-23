-- Korrektur zu 0018: Die Leseregel für "reise" darf die Tabelle nicht selbst abfragen – beim Anlegen
-- (INSERT … RETURNING) ist die neue Zeile für eine Funktion noch nicht sichtbar. Regel daher direkt
-- auf den Spalten der Zeile; inhaltlich identisch mit darf_reise_sehen().
drop policy "Reisen lesen" on reise;
create policy "Reisen lesen" on reise for select using (
  mitarbeiter_id = auth.uid()
  or ist_buchhaltung()
  or (status <> 'entwurf' and (freigeber_id = auth.uid() or darf_genehmigen(mitarbeiter_id)))
);
