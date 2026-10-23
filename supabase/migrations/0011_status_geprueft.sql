-- #7: Zweite Stufe "Belegprüfung" durch die Buchhaltung. Separat, da neue Enum-Werte
-- erst nach dem Commit verwendet werden können.
alter type reise_status add value if not exists 'geprueft' after 'freigegeben';
