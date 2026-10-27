import { createClient } from "@/lib/supabase/server";
import { kiVerfuegbar, type AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { EingangKarte } from "./eingang-karte";
import { Hochladen } from "./hochladen";

export default async function BelegeingangPage() {
  const supabase = await createClient();
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
  const kategorieName = Object.fromEntries((kategorien ?? []).map((k) => [k.id, k.bezeichnung]));
  const auslagenKategorien = (kategorien ?? []).filter((k) => k.abschnitt === "G").map((k) => k.id);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 font-sans sm:p-6">
      <div>
        <h1 className="text-xl font-semibold">Belege</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Belege direkt nach dem Bezahlen fotografieren – sie warten hier, bis du sie am Monatsende einer Reise zuordnest
          oder als Auslage erfasst (z. B. Einkauf im Baumarkt ohne Reise).
        </p>
      </div>

      <Hochladen userId={user!.id} kiAktiv={kiVerfuegbar()} />

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">
          Eingang <span className="text-neutral-500">({eingang?.length ?? 0})</span>
        </h2>
        {!eingang?.length ? (
          <p className="text-sm text-neutral-500">Keine offenen Belege.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {eingang.map((e) => (
              <EingangKarte
                key={e.id}
                reisen={reisen ?? []}
                kategorieName={kategorieName}
                auslagenKategorien={auslagenKategorien}
                eintrag={{
                  id: e.id,
                  bildUrl: urls.get(e.datei_pfad) ?? null,
                  istPdf: e.datei_pfad.endsWith(".pdf"),
                  ergebnis: e.ki_ergebnis as AusgelesenerBeleg | null,
                  kiFehler: e.ki_fehler,
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
