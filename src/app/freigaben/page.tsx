import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDatum, formatEuro } from "@/lib/format";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { istFreigebend, ladeAufgaben } from "@/lib/reisekosten/freigaben";
import type { Reise } from "@/lib/reisekosten/reise";

type Eintrag = Reise & { mitarbeiter: { name: string } | null };

async function Liste({ titel, leer, reisen }: { titel: string; leer: string; reisen: Eintrag[] }) {
  const supabase = await createClient();
  const abrechnungen = await Promise.all(reisen.map((r) => ladeAbrechnung(supabase, r)));

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium">
        {titel} <span className="text-neutral-500">({reisen.length})</span>
      </h2>
      {!reisen.length ? (
        <p className="text-sm text-neutral-500">{leer}</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {reisen.map((r, i) => (
            <li key={r.id}>
              <Link href={`/reisen/${r.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.mitarbeiter?.name}</p>
                  <p className="truncate text-sm text-neutral-500">
                    {r.begruendung} · {r.reiseweg} · {formatDatum(r.beginn)}
                    {r.beleg_nr && ` · ${r.beleg_nr}`}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums">{formatEuro(abrechnungen[i].auszuzahlen)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6 font-sans">
      <h1 className="text-xl font-semibold">Freigaben</h1>
      {freigebend && <Liste titel="Zur Genehmigung" leer="Keine Reisen zu genehmigen." reisen={aufgaben.genehmigen} />}
      {buchhaltung && <Liste titel="Zur Belegprüfung" leer="Keine Reisen zu prüfen." reisen={aufgaben.pruefen} />}
      {buchhaltung && <Liste titel="Zur Auszahlung" leer="Keine Reisen auszuzahlen." reisen={aufgaben.auszahlen} />}
    </main>
  );
}
