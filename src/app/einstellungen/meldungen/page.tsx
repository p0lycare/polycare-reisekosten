import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MeldungBearbeiten } from "@/app/melden/formular";
import { MeldungsListe } from "@/app/melden/liste";

/** Admins: alle Meldungen, offene zuerst */
export default async function MeldungenPage({ searchParams }: { searchParams: Promise<{ alle?: string }> }) {
  const { alle } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: ich } = await supabase.from("profile").select("rolle").eq("id", user!.id).single();
  if (ich?.rolle !== "admin") redirect("/einstellungen");

  let abfrage = supabase
    .from("meldung")
    .select("id, art, text, seite, browser, status, notiz, erstellt_am, person:profile!meldung_person_id_fkey(name)")
    .order("erstellt_am", { ascending: false })
    .limit(200);
  if (!alle) abfrage = abfrage.neq("status", "erledigt");
  const { data } = await abfrage;
  const meldungen = (data ?? []).map(({ person, ...m }) => ({ ...m, name: person?.name ?? "" }));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 font-sans">
      <Link href="/einstellungen" className="text-sm text-neutral-600 underline dark:text-neutral-400">
        ← Einstellungen
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Meldungen</h1>
        <Link href={alle ? "/einstellungen/meldungen" : "/einstellungen/meldungen?alle=1"} className="text-sm underline">
          {alle ? "Nur offene" : "Auch erledigte zeigen"}
        </Link>
      </div>
      <p className="text-sm text-neutral-500">
        Meldungen bleiben im Tool. Für die Weiterentwicklung als GitHub-Issue nur ohne Namen, Beträge oder andere persönliche Daten
        übernehmen – das Repository ist öffentlich.
      </p>
      {!meldungen.length ? (
        <p className="text-sm text-neutral-500">{alle ? "Noch keine Meldungen." : "Keine offenen Meldungen."}</p>
      ) : (
        <MeldungsListe meldungen={meldungen} bearbeiten={(m) => <MeldungBearbeiten id={m.id} status={m.status} notiz={m.notiz} />} />
      )}
    </main>
  );
}
