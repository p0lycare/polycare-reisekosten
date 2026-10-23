-- #15: Erhaltener Vorschuss je Reise
alter table reise add column vorschuss_cent integer not null default 0 check (vorschuss_cent >= 0);
