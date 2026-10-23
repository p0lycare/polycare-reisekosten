-- #18: Empfänger der Benachrichtigungen und Versandprotokoll

-- Empfänger je Workflow-Schritt. Nur aufrufbar von Personen, die die Reise sehen dürfen.
--   eingereicht → hinterlegte genehmigende Person, sonst alle Führungskräfte/Admins
--   genehmigt   → Buchhaltung (falls niemand die Rolle hat: Admins)
--   abgelehnt/geprueft/ausgezahlt → reisende Person
-- Die reisende Person selbst erhält nie eine Aufforderung zur eigenen Genehmigung/Prüfung.
create function mail_empfaenger(p_reise uuid, p_art text) returns table (email text)
  language plpgsql stable security definer set search_path = public as $$
declare r reise; ma profile;
begin
  select * into r from reise where id = p_reise;
  if not found or not (r.mitarbeiter_id = auth.uid() or ist_freigeber()) then return; end if;
  select * into ma from profile where id = r.mitarbeiter_id;

  if p_art = 'eingereicht' then
    if ma.vorgesetzter_id is not null then
      return query select p.email from profile p where p.id = ma.vorgesetzter_id;
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

create table mail_protokoll (
  id bigint generated always as identity primary key,
  zeit timestamptz not null default now(),
  reise_id uuid references reise on delete cascade,
  art text not null,
  an text[] not null default '{}',
  betreff text,
  status text not null check (status in ('gesendet', 'fehler', 'nicht_eingerichtet')),
  fehler text,
  ausgeloest_von uuid references profile
);
create index on mail_protokoll (reise_id);

alter table mail_protokoll enable row level security;
create policy "Buchhaltung sieht Mailprotokoll" on mail_protokoll for select using (ist_buchhaltung());

create function mail_protokollieren(p_reise uuid, p_art text, p_an text[], p_betreff text, p_status text, p_fehler text)
  returns void
  language sql security definer set search_path = public as $$
  insert into mail_protokoll (reise_id, art, an, betreff, status, fehler, ausgeloest_von)
  values (p_reise, p_art, coalesce(p_an, '{}'), p_betreff, p_status, left(p_fehler, 500), auth.uid());
$$;
