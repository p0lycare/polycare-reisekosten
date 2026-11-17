-- Sprache der Oberfläche je Person. Offizielle Unterlagen (Abrechnungs-PDF, DATEV-Versand) bleiben immer deutsch.
alter table profile add column sprache text not null default 'de' check (sprache in ('de', 'en'));
