-- Auslagenabrechnung (FB 21): monatliche Abrechnung von Auslagen ohne Reise (z. B. Baumarkt-Einkäufe).
-- Gleiche Tabelle und gleicher Ablauf wie Reisen, unterschieden über "art"; eigene Beleg-Nummern AL-JJJJ-NNNN.

create type abrechnung_art as enum ('reise', 'auslagen');
alter table reise add column art abrechnung_art not null default 'reise';

-- Höchstens eine Auslagenabrechnung je Person und Monat
create unique index reise_auslagen_je_monat on reise (mitarbeiter_id, date_trunc('month', beginn)) where art = 'auslagen';

-- Angaben je Position wie im Formblatt: Lieferant, Zahlungsart, Kostenstelle
alter table beleg add column lieferant text check (lieferant is null or char_length(lieferant) <= 120);
alter table beleg add column zahlungsart text check (zahlungsart is null or zahlungsart in ('bar', 'ec', 'kreditkarte', 'ueberweisung', 'sonstige'));
alter table beleg add column kostenstelle text check (kostenstelle is null or char_length(kostenstelle) <= 40);

-- Abschnitt G = Auslagen (eigene Kategorien mit Buchungskonto)
alter table kategorie drop constraint kategorie_abschnitt_check;
alter table kategorie add constraint kategorie_abschnitt_check check (abschnitt in ('A', 'B', 'C', 'D', 'E', 'F', 'G'));
insert into kategorie (id, abschnitt, bezeichnung, mwst_prozent, beleg_erfassbar, sortierung) values
  ('aus_material',   'G', 'Material und Werkzeug (z. B. Baumarkt)', 19,   true, 10),
  ('aus_buero',      'G', 'Büromaterial',                           19,   true, 20),
  ('aus_porto',      'G', 'Porto und Versand',                      null, true, 30),
  ('aus_software',   'G', 'Software und Abos',                      19,   true, 40),
  ('aus_fachliteratur', 'G', 'Fachliteratur',                       7,    true, 50),
  ('aus_sonstiges',  'G', 'Sonstige Auslagen',                      null, true, 90)
on conflict (id) do nothing;

-- Beleg-Nummern: RK für Reisen, AL für Auslagen, je eigene fortlaufende Folge pro Jahr
alter table reise drop constraint beleg_nr_format;
alter table reise add constraint beleg_nr_format check (beleg_nr is null or beleg_nr ~ '^(RK|AL)-\d{4}-\d{4}$');

create or replace function reise_pruefen(p_id uuid, p_buchungsmonat date) returns text
  language plpgsql security definer set search_path = public as $$
declare r reise; reisende_rolle rolle; jahr text; praefix text; nr text;
begin
  r := reise_holen(p_id);
  if r.status <> 'freigegeben' then raise exception 'Abrechnung ist nicht genehmigt'; end if;
  if not darf_pruefen(r.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Belegprüfung'; end if;
  if p_buchungsmonat is null then raise exception 'Bitte den Buchungsmonat angeben'; end if;

  select rolle into reisende_rolle from profile where id = r.mitarbeiter_id;
  if r.freigeber_id = auth.uid() and reisende_rolle not in ('admin', 'buchhaltung') then
    raise exception 'Genehmigung und Belegprüfung müssen von verschiedenen Personen kommen';
  end if;

  -- Fortlaufend je Art und Jahr des Buchungsmonats; Sperre verhindert doppelte Nummern bei gleichzeitiger Prüfung
  praefix := case when r.art = 'auslagen' then 'AL' else 'RK' end;
  jahr := to_char(p_buchungsmonat, 'YYYY');
  perform pg_advisory_xact_lock(hashtext('beleg_nr_' || praefix || '_' || jahr));
  select praefix || '-' || jahr || '-' || lpad((coalesce(max(split_part(beleg_nr, '-', 3)::int), 0) + 1)::text, 4, '0')
    into nr from reise where beleg_nr ~ ('^' || praefix || '-' || jahr || '-\d{4}$');

  update reise set status = 'geprueft', beleg_nr = nr,
    buchungsmonat = date_trunc('month', p_buchungsmonat)::date,
    geprueft_von = auth.uid(), geprueft_am = now()
   where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion, kommentar) values (p_id, auth.uid(), 'geprueft', nr);
  return nr;
end;
$$;

-- Auslagen erst mit mindestens einem Beleg einreichen; sonst wie bisher
create or replace function reise_einreichen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise; e einstellungen;
begin
  r := reise_holen(p_id);
  if r.mitarbeiter_id is distinct from auth.uid() then raise exception 'Nur die abrechnende Person kann einreichen'; end if;
  if r.status not in ('entwurf', 'abgelehnt') then raise exception 'Abrechnung wurde bereits eingereicht'; end if;
  if exists (select 1 from vorschuss where reise_id = p_id and status in ('beantragt', 'genehmigt')) then
    raise exception 'Der Vorschuss ist noch nicht ausgezahlt – bitte erst danach einreichen oder den Antrag zurückziehen';
  end if;
  if r.art = 'auslagen' and not exists (select 1 from beleg where reise_id = p_id) then
    raise exception 'Die Auslagenabrechnung hat noch keine Belege';
  end if;
  select * into e from einstellungen;
  update reise set status = 'eingereicht', eingereicht_am = now(),
    km_satz_cent = e.km_satz_cent, km_steuerfrei_cent = e.km_steuerfrei_cent,
    ablehnungsgrund = null, freigeber_id = null, freigegeben_am = null
   where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion) values (p_id, auth.uid(), 'eingereicht');
end;
$$;

-- Art ist nach dem Anlegen fest (sonst ließe sich eine Reise nachträglich zur Auslagenabrechnung machen)
create function reise_art_festhalten() returns trigger
  language plpgsql as $$
begin
  if new.art is distinct from old.art then raise exception 'Die Art der Abrechnung kann nicht geändert werden'; end if;
  return new;
end;
$$;
create trigger reise_art_festhalten before update of art on reise
  for each row execute function reise_art_festhalten();

-- Vorschüsse gibt es nur für Reisen
create function vorschuss_nur_fuer_reisen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from reise where id = new.reise_id and art = 'auslagen') then
    raise exception 'Für Auslagen gibt es keinen Vorschuss';
  end if;
  return new;
end;
$$;
revoke execute on function vorschuss_nur_fuer_reisen() from public, anon;
create trigger vorschuss_nur_fuer_reisen before insert on vorschuss
  for each row execute function vorschuss_nur_fuer_reisen();
