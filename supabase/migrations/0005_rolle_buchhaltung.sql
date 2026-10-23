-- Eigene Rolle für die Belegprüfung (Formblatt: "Prüfer"). Separat, da neue Enum-Werte
-- erst nach dem Commit der Transaktion verwendet werden können.
alter type rolle add value if not exists 'buchhaltung' before 'admin';
