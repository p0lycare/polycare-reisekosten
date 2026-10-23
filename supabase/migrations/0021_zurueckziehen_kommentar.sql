-- Komfort: eingereichte Reise vor der Genehmigung zurückziehen; Kommentar beim Genehmigen

alter table reise_ereignis drop constraint reise_ereignis_aktion_check;
alter table reise_ereignis add constraint reise_ereignis_aktion_check
  check (aktion in ('eingereicht', 'zurueckgezogen', 'genehmigt', 'abgelehnt', 'geprueft', 'ausgezahlt'));

create function reise_zurueckziehen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise;
begin
  r := reise_holen(p_id);
  if r.mitarbeiter_id <> auth.uid() then raise exception 'Nur die reisende Person kann zurückziehen'; end if;
  if r.status <> 'eingereicht' then raise exception 'Nur eingereichte, noch nicht genehmigte Reisen können zurückgezogen werden'; end if;
  update reise set status = 'entwurf', eingereicht_am = null, km_satz_cent = null, km_steuerfrei_cent = null where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion) values (p_id, auth.uid(), 'zurueckgezogen');
end;
$$;

drop function reise_genehmigen(uuid);
create function reise_genehmigen(p_id uuid, p_kommentar text default null) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise;
begin
  r := reise_holen(p_id);
  if r.status <> 'eingereicht' then raise exception 'Reise ist nicht zur Genehmigung eingereicht'; end if;
  if not darf_genehmigen(r.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Genehmigung'; end if;
  update reise set status = 'freigegeben', freigeber_id = auth.uid(), freigegeben_am = now() where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion, kommentar)
  values (p_id, auth.uid(), 'genehmigt', nullif(trim(coalesce(p_kommentar, '')), ''));
end;
$$;
