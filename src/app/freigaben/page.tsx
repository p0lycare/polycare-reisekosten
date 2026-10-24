import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/format";
import { formatIban } from "@/lib/iban";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { istFreigebend, ladeAufgaben, verteileVorschuesse } from "@/lib/reisekosten/freigaben";
import { pruefePlausibilitaet } from "@/lib/reisekosten/plausibilitaet";
import type { Reise } from "@/lib/reisekosten/reise";
import type { Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import { VorschussEntscheiden, type OffenerVorschuss } from "@/app/vorschuss/formulare";
import { SammelListe, type PersonGruppe } from "./sammel-liste";

type Eintrag = Reise & { mitarbeiter: { name: string } | null };
type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Reisen je Person bündeln, mit Beträgen und Zahl der Plausibilitäts-Hinweise */
async function gruppieren(supabase: Supabase, reisen: Eintrag[], ibans: Map<string, string | null>): Promise<PersonGruppe[]> {
  if (!reisen.length) return [];
  const ids = reisen.map((r) => r.id);
  const [abrechnungen, { data: belege }, { data: fahrten }] = await Promise.all([
    Promise.all(reisen.map((r) => ladeAbrechnung(supabase, r))),
    supabase.from("beleg").select("reise_id, kategorie_id, datum, betrag_cent, datei_pfad, kategorie(bezeichnung)").in("reise_id", ids),
    supabase.from("fahrt").select("reise_id, datum, km, km_route").in("reise_id", ids),
  ]);

  const gruppen = new Map<string, PersonGruppe>();
  reisen.forEach((r, i) => {
    const hinweise = pruefePlausibilitaet(
      {
        beginn: r.beginn,
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
        })),
      (fahrten ?? []).filter((f) => f.reise_id === r.id),
    ).length;
    const g = gruppen.get(r.mitarbeiter_id) ?? {
      personId: r.mitarbeiter_id,
      name: r.mitarbeiter?.name ?? "",
      iban: ibans.get(r.mitarbeiter_id) ?? null,
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
          {anzahl} {anzahl === 1 ? "Reise" : "Reisen"} · {formatEuro(summe)}
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

  // IBAN nur für die Auszahlung (lesbar nur für die Buchhaltung)
  const auszahlenIds = [...new Set(aufgaben.auszahlen.map((r) => r.mitarbeiter_id))];
  const { data: privat } =
    buchhaltung && auszahlenIds.length
      ? await supabase.from("profil_privat").select("id, iban").in("id", auszahlenIds)
      : { data: [] as { id: string; iban: string | null }[] };
  const ibans = new Map((privat ?? []).map((p) => [p.id, p.iban ? formatIban(p.iban) : null]));

  // Vorschüsse: genehmigen wie Reisen (Führungskraft), auszahlen durch die Buchhaltung; nie die eigenen
  const { data: vorschuesse } = await supabase
    .from("vorschuss")
    .select("id, reise_id, mitarbeiter_id, betrag_cent, grund, status, reise_anlass, reise_weg, reise_beginn, mitarbeiter:profile!vorschuss_mitarbeiter_id_fkey(name, vorgesetzter_id)")
    .in("status", ["beantragt", "genehmigt"])
    .neq("mitarbeiter_id", user!.id)
    .order("beantragt_am");
  const { genehmigen: vGenehmigen, auszahlen: vAuszahlen } = verteileVorschuesse(vorschuesse ?? [], user!.id, profil?.rolle);
  const vIbanIds = vAuszahlen.map((v) => v.mitarbeiter_id).filter((id) => !ibans.has(id));
  if (vIbanIds.length) {
    const { data } = await supabase.from("profil_privat").select("id, iban").in("id", vIbanIds);
    for (const p of data ?? []) ibans.set(p.id, p.iban ? formatIban(p.iban) : null);
  }
  const alsOffen = (v: NonNullable<typeof vorschuesse>[number]): OffenerVorschuss => ({
    id: v.id,
    reiseId: v.reise_id,
    name: v.mitarbeiter?.name ?? "",
    reise: `${v.reise_anlass} (${v.reise_weg})`,
    beginn: v.reise_beginn,
    betrag: v.betrag_cent,
    grund: v.grund,
    iban: ibans.get(v.mitarbeiter_id) ?? null,
  });

  const [genehmigen, pruefen, auszahlen] = await Promise.all([
    gruppieren(supabase, aufgaben.genehmigen, ibans),
    gruppieren(supabase, aufgaben.pruefen, ibans),
    gruppieren(supabase, aufgaben.auszahlen, ibans),
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
          <SammelListe gruppen={genehmigen} art="genehmigen" leer="Keine Reisen zu genehmigen." />
        </Abschnitt>
      )}
      {buchhaltung && (
        <Abschnitt titel="Zur Belegprüfung" anzahl={anzahlVon(pruefen)} summe={summeVon(pruefen)}>
          <SammelListe gruppen={pruefen} art="pruefen" leer="Keine Reisen zu prüfen." />
        </Abschnitt>
      )}
      {buchhaltung && (
        <Abschnitt titel="Zur Auszahlung" anzahl={anzahlVon(auszahlen)} summe={summeVon(auszahlen)}>
          <SammelListe gruppen={auszahlen} art="auszahlen" leer="Keine Reisen auszuzahlen." />
        </Abschnitt>
      )}
    </main>
  );
}
