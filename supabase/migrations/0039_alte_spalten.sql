-- Aufräumen nach 0036: Büro-Orte und "Büro ist Tätigkeitsstätte" sind durch Standorte ersetzt.
-- Erst die Schutzfunktion ohne die alte Spalte, dann die Spalten entfernen.
create or replace function profil_schuetzen() returns trigger
  language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') or ist_admin() then return new; end if;
  if (new.rolle, new.vorgesetzter_id, new.name, new.email, new.erste_taetigkeitsstaette_id)
     is distinct from (old.rolle, old.vorgesetzter_id, old.name, old.email, old.erste_taetigkeitsstaette_id) then
    raise exception 'Diese Profilfelder kann nur ein Admin ändern';
  end if;
  return new;
end;
$$;

alter table profile drop column buero_ist_taetigkeitsstaette;
alter table einstellungen drop column buero_orte;
