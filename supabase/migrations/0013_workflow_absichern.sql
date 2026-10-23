-- #7: Workflow-Felder sind nur über die Workflow-Funktionen (security definer) änderbar.
-- Direkte Schreibzugriffe aus der App laufen als Rolle "authenticated".

create function reise_workflow_schuetzen() returns trigger
  language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

  if tg_op = 'INSERT' then
    if new.status <> 'entwurf' or new.eingereicht_am is not null or new.freigeber_id is not null
       or new.freigegeben_am is not null or new.ablehnungsgrund is not null or new.km_satz_cent is not null
       or new.km_steuerfrei_cent is not null or new.geprueft_von is not null or new.geprueft_am is not null
       or new.beleg_nr is not null or new.buchungsmonat is not null or new.ausgezahlt_am is not null
       or new.ausgezahlt_von is not null then
      raise exception 'Workflow-Felder dürfen nicht direkt gesetzt werden';
    end if;
  elsif (new.status, new.eingereicht_am, new.freigeber_id, new.freigegeben_am, new.ablehnungsgrund,
         new.km_satz_cent, new.km_steuerfrei_cent, new.geprueft_von, new.geprueft_am, new.beleg_nr,
         new.buchungsmonat, new.ausgezahlt_am, new.ausgezahlt_von, new.mitarbeiter_id)
        is distinct from
        (old.status, old.eingereicht_am, old.freigeber_id, old.freigegeben_am, old.ablehnungsgrund,
         old.km_satz_cent, old.km_steuerfrei_cent, old.geprueft_von, old.geprueft_am, old.beleg_nr,
         old.buchungsmonat, old.ausgezahlt_am, old.ausgezahlt_von, old.mitarbeiter_id) then
    raise exception 'Workflow-Felder dürfen nicht direkt geändert werden';
  end if;
  return new;
end;
$$;

create trigger reise_workflow_schuetzen
  before insert or update on reise
  for each row execute function reise_workflow_schuetzen();

-- Rolle, Vorgesetzte/r, Name und E-Mail ändern nur Admins (Name/E-Mail kommen aus Microsoft)
create function profil_schuetzen() returns trigger
  language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') or ist_admin() then return new; end if;
  if (new.rolle, new.vorgesetzter_id, new.name, new.email)
     is distinct from (old.rolle, old.vorgesetzter_id, old.name, old.email) then
    raise exception 'Diese Profilfelder kann nur ein Admin ändern';
  end if;
  return new;
end;
$$;

create trigger profil_schuetzen
  before update on profile
  for each row execute function profil_schuetzen();

-- Niemand ist sich selbst vorgesetzt
alter table profile add constraint vorgesetzter_nicht_selbst check (vorgesetzter_id is distinct from id);
