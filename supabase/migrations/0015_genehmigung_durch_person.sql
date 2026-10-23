-- Wer bei einer Person als "Genehmigt durch" hinterlegt ist, darf deren Reisen genehmigen –
-- unabhängig von der eigenen Rolle (z. B. CFO mit Rolle Buchhaltung genehmigt die Reisen des CEO).
-- Ohne Eintrag gilt weiter: jede Führungskraft bzw. jeder Admin. Nie die eigene Reise.
create or replace function darf_genehmigen(p_mitarbeiter uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select auth.uid() <> p_mitarbeiter
     and exists (
       select 1 from profile ich, profile ma
        where ich.id = auth.uid() and ma.id = p_mitarbeiter
          and (ma.vorgesetzter_id = ich.id
               or ich.rolle = 'admin'
               or (ich.rolle = 'freigeber' and ma.vorgesetzter_id is null))
     );
$$;
