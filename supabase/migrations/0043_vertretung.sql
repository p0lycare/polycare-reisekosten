-- Vertretung für Genehmigende (z. B. im Urlaub).
-- Je genehmigender Person höchstens eine Vertretung: mit Zeitraum (von/bis) oder „bis auf Weiteres“.
-- Während die Vertretung läuft, darf die Vertretung alle Abrechnungen und Vorschüsse der Personen
-- genehmigen oder ablehnen, bei denen die vertretene Person als „Genehmigt durch“ eingetragen ist.
-- Die vertretene Person behält ihr Recht. Vier-Augen bleibt: niemand genehmigt die eigene Abrechnung.
-- Rückfall, wenn die Vertretung selbst einreicht: Die vertretene Person bleibt zuständig, zusätzlich
-- bekommen die Admins die Mail (sie dürfen ohnehin genehmigen).

create table vertretung (
  vertretene_id uuid primary key references profile on delete cascade,
  vertreter_id uuid not null references profile on delete cascade,
  von date not null,
  bis date,
  bis_auf_weiteres boolean not null default false,
  geaendert_von uuid references profile on delete set null,
  geaendert_am timestamptz not null default now(),
  constraint vertretung_nicht_selbst check (vertreter_id <> vertretene_id),
  constraint vertretung_zeitraum check (
    (bis_auf_weiteres and bis is null) or (not bis_auf_weiteres and bis is not null and bis >= von)
  )
);
create index on vertretung (vertreter_id);

-- Kalendertag in Deutschland (Vertretungen gelten ganztägig)
create function heute_berlin() returns date
  language sql stable set search_path = public as $$
  select (now() at time zone 'Europe/Berlin')::date;
$$;

-- Vertretung muss genehmigen können (sonst kommen Mails, aber keine Freigaben-Seite);
-- wer sie zuletzt geändert hat, wird festgehalten.
create function vertretung_pruefen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profile where id = new.vertreter_id and rolle <> 'mitarbeiter') then
    raise exception 'Die Vertretung braucht eine genehmigende Rolle (Führungskraft, Buchhaltung oder Admin)';
  end if;
  new.geaendert_von := auth.uid();
  new.geaendert_am := now();
  return new;
end;
$$;

create trigger vertretung_pruefen
  before insert or update on vertretung
  for each row execute function vertretung_pruefen();

-- Pflege: Admins (Personen und Rollen) für alle, jede Person für sich selbst (Profil).
-- Lesen: Admins, die vertretene Person und die Vertretung.
alter table vertretung enable row level security;
create policy "Vertretung lesen" on vertretung for select to authenticated
  using (ist_admin() or vertretene_id = auth.uid() or vertreter_id = auth.uid());
create policy "Vertretung anlegen" on vertretung for insert to authenticated
  with check (ist_admin() or vertretene_id = auth.uid());
create policy "Vertretung ändern" on vertretung for update to authenticated
  using (ist_admin() or vertretene_id = auth.uid())
  with check (ist_admin() or vertretene_id = auth.uid());
create policy "Vertretung löschen" on vertretung for delete to authenticated
  using (ist_admin() or vertretene_id = auth.uid());

-- Vertritt p_vertreter heute p_vertretene?
create function vertritt(p_vertreter uuid, p_vertretene uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from vertretung v join profile p on p.id = v.vertreter_id
     where v.vertretene_id = p_vertretene and v.vertreter_id = p_vertreter
       and p.rolle <> 'mitarbeiter'
       and v.von <= heute_berlin()
       and (v.bis_auf_weiteres or v.bis >= heute_berlin())
  );
$$;
revoke execute on function vertritt(uuid, uuid) from public, anon, authenticated;

-- Wie 0015, zusätzlich: die aktive Vertretung der eingetragenen genehmigenden Person.
-- auth.uid() <> p_mitarbeiter hält das Vier-Augen-Prinzip auch für die Vertretung.
create or replace function darf_genehmigen(p_mitarbeiter uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select auth.uid() <> p_mitarbeiter
     and exists (
       select 1 from profile ich, profile ma
        where ich.id = auth.uid() and ma.id = p_mitarbeiter
          and (ma.vorgesetzter_id = ich.id
               or ich.rolle = 'admin'
               or (ich.rolle = 'freigeber' and ma.vorgesetzter_id is null)
               or (ma.vorgesetzter_id is not null and vertritt(ich.id, ma.vorgesetzter_id)))
     );
$$;

-- Für wen genehmigt die angemeldete Person in Vertretung? null, wenn sie es aus eigenem Recht darf.
create function genehmigt_in_vertretung_fuer(p_mitarbeiter uuid) returns uuid
  language sql stable security definer set search_path = public as $$
  select case
           when ma.vorgesetzter_id = ich.id or ich.rolle = 'admin'
                or (ich.rolle = 'freigeber' and ma.vorgesetzter_id is null) then null
           when ma.vorgesetzter_id is not null and vertritt(ich.id, ma.vorgesetzter_id) then ma.vorgesetzter_id
         end
    from profile ich, profile ma
   where ich.id = auth.uid() and ma.id = p_mitarbeiter;
$$;
revoke execute on function genehmigt_in_vertretung_fuer(uuid) from public, anon, authenticated;

-- Verlauf: „in Vertretung für …“ (Name wie person_name festgehalten, auch für das PDF)
alter table reise_ereignis
  add column in_vertretung_fuer uuid references profile on delete set null,
  add column vertreten_name text;

create or replace function ereignis_name_setzen() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  select name into new.person_name from profile where id = new.person_id;
  if new.in_vertretung_fuer is not null then
    select name into new.vertreten_name from profile where id = new.in_vertretung_fuer;
  end if;
  return new;
end;
$$;

create or replace function reise_genehmigen(p_id uuid, p_kommentar text default null) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise;
begin
  r := reise_holen(p_id);
  if r.status <> 'eingereicht' then raise exception 'Reise ist nicht zur Genehmigung eingereicht'; end if;
  if not darf_genehmigen(r.mitarbeiter_id) then raise exception 'Keine Berechtigung zur Genehmigung'; end if;
  update reise set status = 'freigegeben', freigeber_id = auth.uid(), freigegeben_am = now() where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion, kommentar, in_vertretung_fuer)
  values (p_id, auth.uid(), 'genehmigt', nullif(trim(coalesce(p_kommentar, '')), ''),
          genehmigt_in_vertretung_fuer(r.mitarbeiter_id));
end;
$$;

create or replace function reise_ablehnen(p_id uuid, p_grund text) returns void
  language plpgsql security definer set search_path = public as $$
declare r reise; v uuid;
begin
  r := reise_holen(p_id);
  if coalesce(trim(p_grund), '') = '' then raise exception 'Bitte einen Grund angeben'; end if;
  if not ((r.status = 'eingereicht' and darf_genehmigen(r.mitarbeiter_id))
       or (r.status = 'freigegeben' and darf_pruefen(r.mitarbeiter_id))) then
    raise exception 'Keine Berechtigung zur Ablehnung';
  end if;
  if r.status = 'eingereicht' then v := genehmigt_in_vertretung_fuer(r.mitarbeiter_id); end if;
  update reise set status = 'abgelehnt', ablehnungsgrund = trim(p_grund) where id = p_id;
  insert into reise_ereignis (reise_id, person_id, aktion, kommentar, in_vertretung_fuer)
  values (p_id, auth.uid(), 'abgelehnt', trim(p_grund), v);
end;
$$;

-- Mail bei Einreichung: zusätzlich an die aktive Vertretung; reicht die Vertretung selbst ein,
-- zusätzlich an die Admins (Rückfall neben der vertretenen Person).
create or replace function mail_empfaenger(p_reise uuid, p_art text) returns table (email text)
  language plpgsql stable security definer set search_path = public as $$
declare r reise; ma profile;
begin
  select * into r from reise where id = p_reise;
  if not found then return; end if;
  select * into ma from profile where id = r.mitarbeiter_id;

  if p_art = 'eingereicht' then
    if ma.vorgesetzter_id is not null then
      return query select p.email from profile p where p.id = ma.vorgesetzter_id;
      return query
        select p.email from vertretung v join profile p on p.id = v.vertreter_id
         where v.vertretene_id = ma.vorgesetzter_id and v.vertreter_id <> ma.id
           and vertritt(v.vertreter_id, v.vertretene_id);
      if vertritt(ma.id, ma.vorgesetzter_id) then
        return query select p.email from profile p
          where p.rolle = 'admin' and p.id <> ma.id and p.id <> ma.vorgesetzter_id;
      end if;
    else
      return query select p.email from profile p where p.rolle in ('freigeber', 'admin') and p.id <> ma.id;
    end if;
  elsif p_art = 'genehmigt' then
    return query select p.email from profile p where p.rolle = 'buchhaltung' and p.id <> ma.id;
    if not found then
      return query select p.email from profile p where p.rolle = 'admin' and p.id <> ma.id;
    end if;
  elsif p_art in ('abgelehnt', 'geprueft', 'ausgezahlt') then
    return query select ma.email;
  end if;
end;
$$;
revoke execute on function mail_empfaenger(uuid, text) from public, anon, authenticated;
