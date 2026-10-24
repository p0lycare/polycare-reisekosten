-- Auslandspauschalen: Reiseland als ISO-Code oder "ISO:Stadt" (z. B. "US:New York City")
alter table reise alter column land type text;
alter table reise add constraint reise_land_laenge check (char_length(land) between 2 and 60);
