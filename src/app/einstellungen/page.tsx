import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ERFASSBARE_ABSCHNITTE, type Abschnitt } from "@/lib/reisekosten/kategorie";
import { ErinnerungTesten, KategorieZeile, NeueKategorie, ProjektZeile, SaetzeFormular, StandortZeile } from "./formulare";
import { TestmailKnopf } from "./mail/mail-bereich";
import { DatevAdresse } from "./mail/datev-adresse";
import { mailKonfiguration } from "@/lib/mail/graph";
import { adminZugangOk } from "@/lib/supabase/admin";
import { ladeTexte } from "@/lib/i18n/server";

export default async function EinstellungenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profile").select("rolle").eq("id", user!.id).single();
  if (profil?.rolle !== "admin" && profil?.rolle !== "buchhaltung") redirect("/");

  const [{ data: kategorien }, { data: einstellungen }, { data: protokoll }, { data: intern }, { data: projekte }, { data: standorte }] = await Promise.all([
    supabase.from("kategorie").select("*").order("abschnitt").order("sortierung").order("bezeichnung"),
    supabase.from("einstellungen").select("km_satz_cent, km_steuerfrei_cent").single(),
    supabase.from("mail_protokoll").select("id, zeit, art, an, betreff, status, fehler").order("zeit", { ascending: false }).limit(10),
    supabase.from("einstellungen_intern").select("datev_upload_mail, datev_upload_mail_auslagen").maybeSingle(),
    supabase.from("projekt").select("*").order("aktiv", { ascending: false }).order("bezeichnung"),
    supabase.from("standort").select("id, name, orte, aktiv").order("sortierung").order("name"),
  ]);
  const { count: offeneMeldungen } =
    profil?.rolle === "admin" ? await supabase.from("meldung").select("id", { count: "exact", head: true }).neq("status", "erledigt") : { count: 0 };
  const absender = mailKonfiguration() ? process.env.MAIL_ABSENDER : null;
  const serverOk = await adminZugangOk();
  const alle = await ladeTexte();
  const t = alle.einstellungen;
  const zeit = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

  const abschnitte = [...new Set((kategorien ?? []).map((k) => k.abschnitt as Abschnitt))];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6 font-sans">
      <div>
        <h1 className="text-xl font-semibold">{t.seite.titel}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t.seite.text}</p>
        {profil?.rolle === "admin" && (
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <Link href="/einstellungen/personen" className="underline">
              {t.seite.personenLink}
            </Link>
            <Link href="/einstellungen/meldungen" className="underline">
              {t.seite.meldungenLink(offeneMeldungen ?? 0)}
            </Link>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t.mail.titel}</h2>
        {!serverOk && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {t.mail.serverFehler}
          </p>
        )}
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {absender ? t.mail.absender(absender) : t.mail.nichtEingerichtet}
        </p>
        <TestmailKnopf />
        <DatevAdresse reisekosten={intern?.datev_upload_mail ?? ""} auslagen={intern?.datev_upload_mail_auslagen ?? ""} />
        <p className="text-xs text-neutral-500">{t.mail.datevHinweis(absender ?? null)}</p>
        {!!protokoll?.length && (
          <ul className="divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
            {protokoll.map((p) => (
              <li key={p.id} className="flex flex-wrap gap-x-2 py-1.5">
                <span className="text-neutral-500 tabular-nums">{zeit.format(new Date(p.zeit))}</span>
                <span className={p.status === "gesendet" ? "text-green-700 dark:text-green-400" : p.status === "fehler" ? "text-red-700 dark:text-red-400" : "text-neutral-500"}>
                  {p.status === "gesendet" ? t.mail.protokollStatus.gesendet : p.status === "fehler" ? t.mail.protokollStatus.fehler : t.mail.protokollStatus.nichtGesendet}
                </span>
                <span className="min-w-0 truncate">{p.betreff}</span>
                <span className="text-neutral-500">→ {p.an.join(", ")}</span>
                {p.fehler && <span className="w-full text-xs text-red-700 dark:text-red-400">{p.fehler}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t.km.titel}</h2>
        <SaetzeFormular
          kmSatzCent={einstellungen?.km_satz_cent ?? 0}
          kmSteuerfreiCent={einstellungen?.km_steuerfrei_cent ?? 0}
        />
        <p className="text-xs text-neutral-500">{t.km.hinweis}</p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">{t.standorte.titel}</h2>
          <Link href="/einstellungen/personen" className="text-sm underline">
            {t.standorte.zuordnungLink}
          </Link>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.standorte.text}</p>
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-4 dark:divide-neutral-800 dark:border-neutral-800">
          {(standorte ?? []).map((st) => (
            <StandortZeile key={st.id} standort={st} />
          ))}
          <StandortZeile />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">{t.projekte.titel}</h2>
          <Link href="/projekte" className="text-sm underline">
            {t.projekte.auswertungLink}
          </Link>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.projekte.text}</p>
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-4 dark:divide-neutral-800 dark:border-neutral-800">
          {(projekte ?? []).map((p) => (
            <ProjektZeile key={p.id} projekt={p} />
          ))}
          <ProjektZeile />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t.erinnerungen.titel}</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.erinnerungen.text}</p>
        {profil?.rolle === "admin" && <ErinnerungTesten />}
      </section>

      {abschnitte.map((a) => (
        <section key={a} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-medium">
            {a} – {alle.allgemein.abschnitt[a]}
          </h2>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {kategorien!
              .filter((k) => k.abschnitt === a)
              .map((k) => (
                <KategorieZeile key={k.id} kategorie={k} />
              ))}
          </div>
          {ERFASSBARE_ABSCHNITTE.includes(a) && <NeueKategorie abschnitt={a} />}
        </section>
      ))}
    </main>
  );
}
