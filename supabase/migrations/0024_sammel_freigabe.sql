-- Paket C: mehrere Reisen auf einmal genehmigen, prüfen und als ausgezahlt markieren.
-- Jede Reise durchläuft die Einzelfunktion mit allen Prüfungen; scheitert eine, passiert nichts.

create function reisen_genehmigen(p_ids uuid[], p_kommentar text default null) returns integer
  language plpgsql security definer set search_path = public as $$
declare rid uuid; anzahl integer := 0;
begin
  if coalesce(array_length(p_ids, 1), 0) = 0 then raise exception 'Keine Reisen ausgewählt'; end if;
  if array_length(p_ids, 1) > 100 then raise exception 'Höchstens 100 Reisen auf einmal'; end if;
  foreach rid in array p_ids loop
    perform reise_genehmigen(rid, p_kommentar);
    anzahl := anzahl + 1;
  end loop;
  return anzahl;
end;
$$;

create function reisen_pruefen(p_ids uuid[], p_buchungsmonat date) returns integer
  language plpgsql security definer set search_path = public as $$
declare rid uuid; anzahl integer := 0;
begin
  if coalesce(array_length(p_ids, 1), 0) = 0 then raise exception 'Keine Reisen ausgewählt'; end if;
  if array_length(p_ids, 1) > 100 then raise exception 'Höchstens 100 Reisen auf einmal'; end if;
  foreach rid in array p_ids loop
    perform reise_pruefen(rid, p_buchungsmonat);
    anzahl := anzahl + 1;
  end loop;
  return anzahl;
end;
$$;

create function reisen_auszahlen(p_ids uuid[]) returns integer
  language plpgsql security definer set search_path = public as $$
declare rid uuid; anzahl integer := 0;
begin
  if coalesce(array_length(p_ids, 1), 0) = 0 then raise exception 'Keine Reisen ausgewählt'; end if;
  if array_length(p_ids, 1) > 100 then raise exception 'Höchstens 100 Reisen auf einmal'; end if;
  foreach rid in array p_ids loop
    perform reise_auszahlen(rid);
    anzahl := anzahl + 1;
  end loop;
  return anzahl;
end;
$$;
