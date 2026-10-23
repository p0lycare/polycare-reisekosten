-- #7: Zweistufiger Workflow – ersetzt die Unterschriften des Formblatts FB 06
--   entwurf/abgelehnt → eingereicht ("Für die Richtigkeit", Reisende/r)
--   eingereicht → freigegeben ("Genehmigung", Führungskraft) | abgelehnt
--   freigegeben → geprueft ("Belegprüfung", Buchhaltung, Beleg-Nr.) | abgelehnt
--   geprueft → ausgezahlt (Buchhaltung)
-- Statuswechsel laufen ausschließlich über die Funktionen unten.

alter table profile add column vorgesetzter_id uuid references profile on delete set null;

alter table reise
  add column eingereicht_am timestamptz,
  add column km_satz_cent integer,
  add column km_steuerfrei_cent integer,
  add column geprueft_von uuid references profile,
  add column geprueft_am timestamptz,
  add column beleg_nr text unique,
  add column buchungsmonat date,
  add column ausgezahlt_am timestamptz,
  add column ausgezahlt_von uuid references profile;

create table reise_ereignis (
  id bigint generated always as identity primary key,
  reise_id uuid not null references reise on delete cascade,
  zeit timestamptz not null default now(),
  person_id uuid not null references profile,
  aktion text not null check (aktion in ('eingereicht', 'genehmigt', 'abgelehnt', 'geprueft', 'ausgezahlt')),
  kommentar text
);
create index on reise_ereignis (reise_id);

alter table reise_ereignis enable row level security;
create policy "Verlauf lesen wie Reise" on reise_ereignis for select
  using (exists (select 1 from reise r where r.id = reise_id
                 and (r.mitarbeiter_id = auth.uid() or ist_freigeber())));

-- Status darf nicht mehr direkt per UPDATE geändert werden
drop policy "Freigeber entscheiden" on reise;

-- Admins pflegen Rollen und Vorgesetzte
create function ist_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from profile where id = auth.uid() and rolle = 'admin');
$$;
create policy "Admins pflegen Profile" on profile for update
  using (ist_admin()) with check (ist_admin());

-- Darf die angemeldete Person die Reise genehmigen? Nie die eigene; ist eine Führungskraft
-- hinterlegt, nur diese (oder ein Admin), sonst jede Person mit Rolle freigeber/admin.
create function darf_genehmigen(p_mitarbeiter uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select auth.uid() <> p_mitarbeiter
     and exists (
       select 1 from profile ich, profile ma
        where ich.id = auth.uid() and ma.id = p_mitarbeiter
          and (ich.rolle = 'admin'
               or (ich.rolle = 'freigeber' and (ma.vorgesetzter_id is null or ma.vorgesetzter_id = ich.id)))
     );
$$;

create function darf_pruefen(p_mitarbeiter uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select auth.uid() <> p_mitarbeiter and ist_buchhaltung();
$$;

create function reise_holen(p_id uuid) returns reise
  language plpgsql security definer set search_path = public as $$
declare r reise;
begin
  select * into r from reise where id = p_id for update;
  if not found then raise exception 'Reise nicht gefunden'; end if;
  return r;
end;
$$;

create function reise_einreichen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise; e einstellungen;
begin
  r := reise_holen(p_id);
  if r.mitarbeiter_id <> auth.uid() then raise exception 'Nur die reisende Person kann einreichen'; end if;
  if r.status not in ('entwurf', 'abgelehnt') then raise exception 'Reise wurde bereits eingereicht'; end if;
  select * into e from einstellungen;
  update reise set status = 'eingereicht', eingereicht_am = now(),
    km_satz_cent = e.km_satz_cent, km_steuerfrei_cent = e.km_steuerfrei_cent,
    ablehnungsgrund = null, freigeber_id = null, freigegeben_am = null
   where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion) values (p_id, auth.uid(), 'eingereicht');
end;
$$;

create function reise_genehmigen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise;
begin
  r := reise_holen(p_id);
  if r.status <> 'eingereicht' then raise exception 'Reise ist nicht zur Genehmigung eingereicht'; end if;
  if not darf_genehmigen(r.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Genehmigung'; end if;
  update reise set status = 'freigegeben', freigeber_id = auth.uid(), freigegeben_am = now() where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion) values (p_id, auth.uid(), 'genehmigt');
end;
$$;

create function reise_ablehnen(p_id uuid, p_grund text) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise;
begin
  r := reise_holen(p_id);
  if coalesce(trim(p_grund), '') = '' then raise exception 'Bitte einen Grund angeben'; end if;
  if not ((r.status = 'eingereicht' and darf_genehmigen(r.mitarbeiter_id))
       or (r.status = 'freigegeben' and darf_pruefen(r.mitarbeiter_id))) then
    raise exception 'Keine Berechtigung zur Ablehnung';
  end if;
  update reise set status = 'abgelehnt', ablehnungsgrund = trim(p_grund) where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion, kommentar) values (p_id, auth.uid(), 'abgelehnt', trim(p_grund));
end;
$$;

-- Vorschlag für die nächste Beleg-Nr. im Format RK-JJJJ-NNNN
create function naechste_beleg_nr() returns text
  language sql stable security definer set search_path = public as $$
  select 'RK-' || to_char(now(), 'YYYY') || '-' || lpad((coalesce(max(split_part(beleg_nr, '-', 3)::int), 0) + 1)::text, 4, '0')
    from reise where beleg_nr ~ ('^RK-' || to_char(now(), 'YYYY') || '-\d{4}$');
$$;

create function reise_pruefen(p_id uuid, p_beleg_nr text, p_buchungsmonat date) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise;
begin
  r := reise_holen(p_id);
  if r.status <> 'freigegeben' then raise exception 'Reise ist nicht genehmigt'; end if;
  if not darf_pruefen(r.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Belegprüfung'; end if;
  if coalesce(trim(p_beleg_nr), '') = '' then raise exception 'Bitte eine Beleg-Nr. angeben'; end if;
  update reise set status = 'geprueft', beleg_nr = trim(p_beleg_nr),
    buchungsmonat = date_trunc('month', p_buchungsmonat)::date,
    geprueft_von = auth.uid(), geprueft_am = now()
   where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion, kommentar) values (p_id, auth.uid(), 'geprueft', trim(p_beleg_nr));
end;
$$;

create function reise_auszahlen(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise;
begin
  r := reise_holen(p_id);
  if r.status <> 'geprueft' then raise exception 'Reise ist nicht geprüft'; end if;
  if not darf_pruefen(r.mitarbeiter_id) then raise exception 'Keine Berechtigung'; end if;
  update reise set status = 'ausgezahlt', ausgezahlt_am = now(), ausgezahlt_von = auth.uid() where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion) values (p_id, auth.uid(), 'ausgezahlt');
end;
$$;

-- Interne Hilfsfunktion nicht direkt aufrufbar machen
revoke execute on function reise_holen(uuid) from public, anon, authenticated;
