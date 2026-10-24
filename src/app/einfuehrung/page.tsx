import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { FuerAdmins, FuerAlle, FuerBuchhaltung, FuerFuehrungskraefte } from "./inhalte";

type Rolle = Database["public"]["Enums"]["rolle"];

const ROLLEN: { wert: Rolle; text: string }[] = [
  { wert: "mitarbeiter", text: "Mitarbeiter/in" },
  { wert: "freigeber", text: "Führungskraft" },
  { wert: "buchhaltung", text: "Buchhaltung" },
  { wert: "admin", text: "Admin" },
];

function aktuellerMonat(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).format(new Date());
}

function Punkt({ erledigt, optional, children }: { erledigt: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-label={erledigt ? "erledigt" : "offen"}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
          erledigt ? "bg-marke text-white" : "border border-neutral-300 dark:border-neutral-600"
        }`}
      >
        {erledigt && "✓"}
      </span>
      <span className={erledigt ? "text-neutral-500" : ""}>
        {children}
        {optional && !erledigt && <span className="text-neutral-500"> (optional)</span>}
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
  const rolle = eigeneRolle === "admin" && ROLLEN.some((r) => r.wert === ansicht) ? (ansicht as Rolle) : eigeneRolle;
  const genehmigt = rolle !== "mitarbeiter";
  const bucht = rolle === "buchhaltung" || rolle === "admin";
  const vorname = profil?.name?.split(" ")[0] ?? "";
  const startklar = !!privat?.wohnort;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6 font-sans">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Willkommen{vorname && `, ${vorname}`}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Hier erfasst du Dienstreisen, fotografierst Belege und reichst einmal im Monat ein – ohne Excel und ohne Papierstapel.
          {genehmigt && " Weiter unten steht, was für deine Rolle dazukommt."}
        </p>
        {eigeneRolle === "admin" && (
          <nav aria-label="Ansicht für Rolle" className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-500">Ansicht für:</span>
            {ROLLEN.map((r) => (
              <Link
                key={r.wert}
                href={r.wert === "admin" ? "/einfuehrung" : `/einfuehrung?ansicht=${r.wert}`}
                aria-current={rolle === r.wert ? "page" : undefined}
                className={`rounded-md border px-2.5 py-1 ${
                  rolle === r.wert ? "border-marke bg-marke-hell text-marke-dunkel" : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {r.text}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <section className="flex flex-col gap-4 bg-flaeche p-5">
        <div>
          <h2 className="font-semibold">{startklar ? "Du bist startklar" : "In 2 Minuten startklar"}</h2>
          <p className="text-sm text-neutral-500">Einmal im Profil eintragen – danach füllt das Tool vieles selbst aus.</p>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          <Punkt erledigt={!!privat?.wohnort}>Wohnort (für Reiseweg und Fahrten)</Punkt>
          <Punkt erledigt={!!privat?.personalnummer}>Personalnummer</Punkt>
          <Punkt erledigt={!!profil?.kfz_kennzeichen} optional>
            Kfz-Kennzeichen, falls du mit dem eigenen Auto fährst
          </Punkt>
          <Punkt erledigt={!!profil?.kalender_vorschlaege} optional>
            Reisen aus dem Outlook-Kalender vorschlagen lassen
          </Punkt>
        </ul>
        {!profil?.vorgesetzter_id && eigeneRolle !== "admin" && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Für dich ist noch keine genehmigende Führungskraft hinterlegt – das richtet ein Admin ein. Bis dahin kann jede Führungskraft
            genehmigen.
          </p>
        )}
        <div>
          <Link href="/profil" className="inline-block rounded-md bg-primaer px-4 py-2 text-sm font-medium text-white hover:bg-primaer-hover dark:text-neutral-950">
            {startklar ? "Profil ansehen" : "Profil ausfüllen"}
          </Link>
        </div>
      </section>

      <FuerAlle kmSatzCent={einstellungen?.km_satz_cent ?? 0} kmSteuerfreiCent={einstellungen?.km_steuerfrei_cent ?? 0} monat={aktuellerMonat()} />
      {genehmigt && <FuerFuehrungskraefte />}
      {bucht && <FuerBuchhaltung />}
      {rolle === "admin" && <FuerAdmins />}

      <p className="border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-800">
        Fragen, Fehler oder Wünsche? Oben auf „Feedback“ tippen – die Admins bekommen deine Meldung direkt. Diese Einführung findest du jederzeit unter „Hilfe“.
      </p>
    </main>
  );
}
