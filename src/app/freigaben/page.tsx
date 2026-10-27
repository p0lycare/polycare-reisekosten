import Link from "next/link";

// Sammel-Prüfen schickt je Abrechnung ein PDF an DATEV – dafür mehr Zeit als die Standardlaufzeit
export const maxDuration = 300;
import { SeitenHilfe } from "@/app/seiten-hilfe";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/format";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { istFreigebend, ladeAufgaben, verteileVorschuesse } from "@/lib/reisekosten/freigaben";
import { pruefePlausibilitaet } from "@/lib/reisekosten/plausibilitaet";
import type { Reise } from "@/lib/reisekosten/reise";
import type { Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import { VorschussEntscheiden, type OffenerVorschuss } from "@/app/vorschuss/formulare";
import { SammelListe, type PersonGruppe } from "./sammel-liste";
import { fehlendeAngabenText } from "@/lib/reisekosten/pflichtangaben";

type Eintrag = Reise & { mitarbeiter: { name: string } | null };
type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Reisen je Person bündeln, mit Beträgen und Zahl der Plausibilitäts-Hinweise */
async function gruppieren(supabase: Supabase, reisen: Eintrag[]): Promise<PersonGruppe[]> {
  if (!reisen.length) return [];
  const ids = reisen.map((r) => r.id);
  const [abrechnungen, { data: belege }, { data: fahrten }] = await Promise.all([
    Promise.all(reisen.map((r) => ladeAbrechnung(supabase, r))),
    supabase.from("beleg").select("reise_id, kategorie_id, datum, betrag_cent, datei_pfad, beschreibung, anlass, person, kfz_kennzeichen, kategorie(bezeichnung, abschnitt, pflichtangaben)").in("reise_id", ids),
    supabase.from("fahrt").select("reise_id, datum, km, km_route").in("reise_id", ids),
  ]);

  const gruppen = new Map<string, PersonGruppe>();
  reisen.forEach((r, i) => {
    const hinweise = pruefePlausibilitaet(
      {
        beginn: r.beginn,
        land: r.land,
        art: r.art,
        ende: r.ende,
        mitUebernachtung: r.mit_uebernachtung,
        verkehrsmittel: r.verkehrsmittel,
        mahlzeiten: (r.mahlzeiten ?? {}) as Record<string, Mahlzeiten>,
      },
      (belege ?? [])
        .filter((b) => b.reise_id === r.id)
        .map((b) => ({
          kategorieId: b.kategorie_id,
          bezeichnung: b.kategorie?.bezeichnung ?? "",
          datum: b.datum,
          betragCent: b.betrag_cent,
          hatDatei: !!b.datei_pfad,
          beschreibung: b.beschreibung,
          fehlendeAngaben: fehlendeAngabenText(b),
        })),
      (fahrten ?? []).filter((f) => f.reise_id === r.id),
    ).length;
    const g = gruppen.get(r.mitarbeiter_id) ?? {
      personId: r.mitarbeiter_id,
      name: r.mitarbeiter?.name ?? "",
      reisen: [],
    };
    g.reisen.push({
      id: r.id,
      begruendung: r.begruendung,
      reiseweg: r.reiseweg,
      beginn: r.beginn,
      ende: r.ende,
      betrag: abrechnungen[i].auszuzahlen,
      belegNr: r.beleg_nr,
      hinweise,
    });
    gruppen.set(r.mitarbeiter_id, g);
  });
  return [...gruppen.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

function Abschnitt({ titel, anzahl, summe, children }: { titel: string; anzahl: number; summe: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">
        {titel}{" "}
        <span className="text-sm font-normal text-neutral-500 tabular-nums">
          {anzahl} {anzahl === 1 ? "Abrechnung" : "Abrechnungen"} · {formatEuro(summe)}
        </span>
      </h2>
      {children}
    </section>
  );
}

const summeVon = (g: PersonGruppe[]) => g.reduce((s, p) => s + p.reisen.reduce((t, r) => t + r.betrag, 0), 0);
const anzahlVon = (g: PersonGruppe[]) => g.reduce((s, p) => s + p.reisen.length, 0);

export default async function FreigabenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profile").select("rolle").eq("id", user!.id).single();
  if (!istFreigebend(profil?.rolle)) redirect("/");

  const aufgaben = await ladeAufgaben(supabase, user!.id, profil?.rolle);
  const buchhaltung = profil?.rolle === "buchhaltung" || profil?.rolle === "admin";
  const freigebend = profil?.rolle === "freigeber" || profil?.rolle === "admin";

  // Vorschüsse: genehmigen wie Reisen (Führungskraft), auszahlen durch die Buchhaltung; nie die eigenen
  const { data: vorschuesse } = await supabase
    .from("vorschuss")
    .select("id, reise_id, mitarbeiter_id, betrag_cent, grund, status, reise_anlass, reise_weg, reise_beginn, mitarbeiter:profile!vorschuss_mitarbeiter_id_fkey(name, vorgesetzter_id)")
    .in("status", ["beantragt", "genehmigt"])
    .neq("mitarbeiter_id", user!.id)
    .order("beantragt_am");
  const { genehmigen: vGenehmigen, auszahlen: vAuszahlen } = verteileVorschuesse(vorschuesse ?? [], user!.id, profil?.rolle);
  const alsOffen = (v: NonNullable<typeof vorschuesse>[number]): OffenerVorschuss => ({
    id: v.id,
    reiseId: v.reise_id,
    name: v.mitarbeiter?.name ?? "",
    reise: `${v.reise_anlass} (${v.reise_weg})`,
    beginn: v.reise_beginn,
    betrag: v.betrag_cent,
    grund: v.grund,
  });

  const [genehmigen, pruefen, auszahlen] = await Promise.all([
    gruppieren(supabase, aufgaben.genehmigen),
    gruppieren(supabase, aufgaben.pruefen),
    gruppieren(supabase, aufgaben.auszahlen),
  ]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-4 font-sans sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Freigaben</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/uebersicht" className="underline">
            Übersicht
          </Link>
          {buchhaltung && (
            <Link href="/projekte" className="underline">
              Projekte
            </Link>
          )}
        </div>
      </div>
      <SeitenHilfe anker={buchhaltung ? "buchhaltung" : "fuehrungskraefte"}>
        {buchhaltung
          ? "Hier wartet, was du tun musst: Reisen und Auslagen deines Teams genehmigen, Belege prüfen (damit gehen sie an DATEV) und nach der Überweisung in DATEV als ausgezahlt markieren. Alles ist je Person gebündelt."
          : "Hier genehmigst du die eingereichten Reisen und Auslagen deines Teams – je Person gebündelt, meist in einem Schritt pro Monat. Danach prüft die Buchhaltung die Belege."}
      </SeitenHilfe>

      {(vGenehmigen.length > 0 || vAuszahlen.length > 0) && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Vorschüsse</h2>
          <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {vGenehmigen.map((v) => (
              <VorschussEntscheiden key={v.id} v={alsOffen(v)} art="genehmigen" />
            ))}
            {vAuszahlen.map((v) => (
              <VorschussEntscheiden key={v.id} v={alsOffen(v)} art="auszahlen" />
            ))}
          </ul>
        </section>
      )}

      {(freigebend || genehmigen.length > 0) && (
        <Abschnitt titel="Zur Genehmigung" anzahl={anzahlVon(genehmigen)} summe={summeVon(genehmigen)}>
          <SammelListe gruppen={genehmigen} art="genehmigen" leer="Nichts zu genehmigen." />
        </Abschnitt>
      )}
      {buchhaltung && (
        <Abschnitt titel="Zur Belegprüfung" anzahl={anzahlVon(pruefen)} summe={summeVon(pruefen)}>
          <SammelListe gruppen={pruefen} art="pruefen" leer="Nichts zu prüfen." />
        </Abschnitt>
      )}
      {buchhaltung && (
        <Abschnitt titel="Zur Auszahlung" anzahl={anzahlVon(auszahlen)} summe={summeVon(auszahlen)}>
          <SammelListe gruppen={auszahlen} art="auszahlen" leer="Nichts auszuzahlen." />
        </Abschnitt>
      )}
    </main>
  );
}
