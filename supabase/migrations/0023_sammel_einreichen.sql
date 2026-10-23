-- Paket B: mehrere Reisen (z. B. einen Monat) mit einer Bestätigung einreichen.
-- Jede Reise durchläuft dieselben Prüfungen wie beim einzelnen Einreichen; schlägt eine fehl,
-- wird nichts eingereicht.
create function reisen_einreichen(p_ids uuid[]) returns integer
  language plpgsql security definer set search_path = public as $$
declare rid uuid; anzahl integer := 0;
begin
  if p_ids is null or array_length(p_ids, 1) is null then raise exception 'Keine Reisen ausgewählt'; end if;
  if array_length(p_ids, 1) > 50 then raise exception 'Höchstens 50 Reisen auf einmal'; end if;
  foreach rid in array p_ids loop
    perform reise_einreichen(rid);
    anzahl := anzahl + 1;
  end loop;
  return anzahl;
end;
$$;
