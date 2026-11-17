import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { ladeTexte } from "@/lib/i18n/server";
import { FuerAdmins, FuerAlle, FuerBuchhaltung, FuerFuehrungskraefte } from "./inhalte";

type Rolle = Database["public"]["Enums"]["rolle"];

const ROLLEN: Rolle[] = ["mitarbeiter", "freigeber", "buchhaltung", "admin"];

function aktuellerMonat(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).format(new Date());
}

function Punkt({
  erledigt,
  optional,
  texte,
  children,
}: {
  erledigt: boolean;
  optional?: boolean;
  texte: { erledigt: string; offen: string; optional: string };
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-label={erledigt ? texte.erledigt : texte.offen}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
          erledigt ? "bg-marke text-white" : "border border-neutral-300 dark:border-neutral-600"
        }`}
      >
        {erledigt && "✓"}
      </span>
      <span className={erledigt ? "text-neutral-500" : ""}>
        {children}
        {optional && !erledigt && <span className="text-neutral-500">{texte.optional}</span>}
      </span>
    </li>
  );
}

/**
 * Einführung je Rolle: persönliche Startklar-Liste und die Teile, die zur eigenen Rolle gehören.
 * Admins können sich ansehen, was eine andere Rolle sieht (?ansicht=…).
 */
export default async function EinfuehrungPage({ searchParams }: { searchParams: Promise<{ ansicht?: string }> }) {
  const { ansicht } = await searchParams;
  const t = (await ladeTexte()).einfuehrung;
  const s = t.seite;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profil }, { data: privat }, { data: einstellungen }] = await Promise.all([
    supabase.from("profile").select("name, rolle, vorgesetzter_id, kfz_kennzeichen, kalender_vorschlaege").eq("id", user!.id).single(),
    supabase.from("profil_privat").select("personalnummer, wohnort").eq("id", user!.id).maybeSingle(),
    supabase.from("einstellungen").select("km_satz_cent, km_steuerfrei_cent").single(),
  ]);

  const eigeneRolle = profil?.rolle ?? "mitarbeiter";
  const rolle = eigeneRolle === "admin" && ROLLEN.includes(ansicht as Rolle) ? (ansicht as Rolle) : eigeneRolle;
  const genehmigt = rolle !== "mitarbeiter";
  const bucht = rolle === "buchhaltung" || rolle === "admin";
  const vorname = profil?.name?.split(" ")[0] ?? "";
  const startklar = !!privat?.wohnort;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6 font-sans">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{s.willkommen(vorname)}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {s.intro}
          {genehmigt && s.introRolle}
        </p>
        <div>
          <Link
            href={rolle !== eigeneRolle ? `/einfuehrung/tour?ansicht=${rolle}` : "/einfuehrung/tour"}
            className="inline-block rounded-md bg-primaer px-4 py-2 text-sm font-medium text-white hover:bg-primaer-hover dark:text-neutral-950"
          >
            {s.tourStarten}
          </Link>
        </div>
        {eigeneRolle === "admin" && (
          <nav aria-label={s.ansichtNavigation} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-500">{s.ansichtFuer}</span>
            {ROLLEN.map((r) => (
              <Link
                key={r}
                href={r === "admin" ? "/einfuehrung" : `/einfuehrung?ansicht=${r}`}
                aria-current={rolle === r ? "page" : undefined}
                className={`rounded-md border px-2.5 py-1 ${
                  rolle === r ? "border-marke bg-marke-hell text-marke-dunkel" : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {s.rollen[r]}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <section className="flex flex-col gap-4 bg-flaeche p-5">
        <div>
          <h2 className="font-semibold">{startklar ? s.startklar : s.startklarIn}</h2>
          <p className="text-sm text-neutral-500">{s.startklarText}</p>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          <Punkt erledigt={!!privat?.wohnort} texte={s}>
            {s.punkte.wohnort}
          </Punkt>
          <Punkt erledigt={!!privat?.personalnummer} texte={s}>
            {s.punkte.personalnummer}
          </Punkt>
          <Punkt erledigt={!!profil?.kfz_kennzeichen} optional texte={s}>
            {s.punkte.kfz}
          </Punkt>
          <Punkt erledigt={!!profil?.kalender_vorschlaege} optional texte={s}>
            {s.punkte.kalender}
          </Punkt>
        </ul>
        {!profil?.vorgesetzter_id && eigeneRolle !== "admin" && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {s.keineFuehrungskraft}
          </p>
        )}
        <div>
          <Link href="/profil" className="inline-block rounded-md bg-primaer px-4 py-2 text-sm font-medium text-white hover:bg-primaer-hover dark:text-neutral-950">
            {startklar ? s.profilAnsehen : s.profilAusfuellen}
          </Link>
        </div>
      </section>

      <FuerAlle t={t} kmSatzCent={einstellungen?.km_satz_cent ?? 0} kmSteuerfreiCent={einstellungen?.km_steuerfrei_cent ?? 0} monat={aktuellerMonat()} />
      {genehmigt && <FuerFuehrungskraefte t={t} />}
      {bucht && <FuerBuchhaltung t={t} />}
      {rolle === "admin" && <FuerAdmins t={t} />}

      <p className="border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-800">
        {s.fussnote}
      </p>
    </main>
  );
}
