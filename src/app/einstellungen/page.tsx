import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ABSCHNITT_TEXT, ERFASSBARE_ABSCHNITTE, type Abschnitt } from "@/lib/reisekosten/kategorie";
import { KategorieZeile, NeueKategorie, SaetzeFormular } from "./formulare";

export default async function EinstellungenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profile").select("rolle").eq("id", user!.id).single();
  if (profil?.rolle !== "admin" && profil?.rolle !== "buchhaltung") redirect("/");

  const [{ data: kategorien }, { data: einstellungen }] = await Promise.all([
    supabase.from("kategorie").select("*").order("abschnitt").order("sortierung").order("bezeichnung"),
    supabase.from("einstellungen").select("km_satz_cent, km_steuerfrei_cent").single(),
  ]);

  const abschnitte = [...new Set((kategorien ?? []).map((k) => k.abschnitt as Abschnitt))];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6 font-sans">
      <div>
        <h1 className="text-xl font-semibold">Einstellungen</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Kategorien, MwSt-Sätze und Buchungskonten für die Abrechnung. Leerer MwSt-Satz: wird je Beleg gewählt.
        </p>
        {profil?.rolle === "admin" && (
          <Link href="/einstellungen/personen" className="mt-2 inline-block text-sm underline">
            Personen und Rollen verwalten →
          </Link>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Km-Geld</h2>
        <SaetzeFormular
          kmSatzCent={einstellungen?.km_satz_cent ?? 0}
          kmSteuerfreiCent={einstellungen?.km_steuerfrei_cent ?? 0}
        />
        <p className="text-xs text-neutral-500">
          Der Anteil über dem steuerfreien Satz wird als steuerpflichtiger Arbeitslohn ausgewiesen.
        </p>
      </section>

      {abschnitte.map((a) => (
        <section key={a} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-medium">
            {a} – {ABSCHNITT_TEXT[a]}
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
