import { createClient } from "@/lib/supabase/server";
import { uebersetzeMeldung } from "@/lib/i18n/meldungen";
import { kiVerfuegbar, type AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { ladeSprache } from "@/lib/i18n/server";
import { kategorieName, texte } from "@/lib/i18n/woerterbuch";
import { EingangKarte } from "./eingang-karte";
import { Hochladen } from "./hochladen";

export default async function BelegeingangPage() {
  const supabase = await createClient();
  const sprache = await ladeSprache();
  const t = texte(sprache).belege.seite;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: eingang }, { data: reisen }, { data: kategorien }] = await Promise.all([
    supabase.from("beleg_eingang").select("*").eq("mitarbeiter_id", user!.id).order("created_at", { ascending: false }),
    supabase
      .from("reise")
      .select("id, begruendung, reiseweg, beginn, ende")
      .eq("mitarbeiter_id", user!.id)
      .eq("art", "reise")
      .in("status", ["entwurf", "abgelehnt"])
      .order("beginn", { ascending: false }),
    supabase.from("kategorie").select("id, bezeichnung, abschnitt"),
  ]);

  const pfade = (eingang ?? []).map((e) => e.datei_pfad);
  const { data: signiert } = pfade.length ? await supabase.storage.from("belege").createSignedUrls(pfade, 3600) : { data: [] };
  const urls = new Map((signiert ?? []).map((s) => [s.path, s.signedUrl]));
  const kategorieNamen = Object.fromEntries((kategorien ?? []).map((k) => [k.id, kategorieName(sprache, k.id, k.bezeichnung)]));
  const auslagenKategorien = (kategorien ?? []).filter((k) => k.abschnitt === "G").map((k) => k.id);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 font-sans sm:p-6">
      <div>
        <h1 className="text-xl font-semibold">{t.titel}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t.intro}</p>
      </div>

      <Hochladen userId={user!.id} kiAktiv={kiVerfuegbar()} />

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">
          {t.eingang} <span className="text-neutral-500">({eingang?.length ?? 0})</span>
        </h2>
        {!eingang?.length ? (
          <p className="text-sm text-neutral-500">{t.keineOffenen}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {eingang.map((e) => (
              <EingangKarte
                key={e.id}
                reisen={reisen ?? []}
                kategorieName={kategorieNamen}
                auslagenKategorien={auslagenKategorien}
                eintrag={{
                  id: e.id,
                  bildUrl: urls.get(e.datei_pfad) ?? null,
                  istPdf: e.datei_pfad.endsWith(".pdf"),
                  ergebnis: e.ki_ergebnis as AusgelesenerBeleg | null,
                  kiFehler: e.ki_fehler && uebersetzeMeldung(e.ki_fehler, sprache),
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
