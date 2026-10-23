-- Name der handelnden Person im Verlauf speichern: Mitarbeitende dürfen fremde Profile nicht lesen,
-- sollen aber sehen, wer genehmigt oder abgelehnt hat.
alter table reise_ereignis add column person_name text;

create function ereignis_name_setzen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  select name into new.person_name from profile where id = new.person_id;
  return new;
end;
$$;

create trigger ereignis_name_setzen
  before insert on reise_ereignis
  for each row execute function ereignis_name_setzen();
