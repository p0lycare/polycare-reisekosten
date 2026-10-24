-- Km-Geld nur noch in Höhe des steuerfreien Satzes (0,30 €/km); damit entfällt steuerpflichtiges Km-Geld
update einstellungen set km_satz_cent = 30, km_steuerfrei_cent = 30, updated_at = now();
