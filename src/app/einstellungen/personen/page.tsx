import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PersonZeile, type Person } from "./person-zeile";
import { ladeTexte } from "@/lib/i18n/server";
import { heuteBerlin, type Vertretung } from "@/lib/reisekosten/vertretung";
import { VertretungFormular } from "./vertretung-formular";

export default async function PersonenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: ich } = await supabase.from("profile").select("rolle").eq("id", user!.id).single();
  if (ich?.rolle !== "admin") redirect("/einstellungen");

  const { data } = await supabase.from("profile").select("id, name, email, rolle, vorgesetzter_id, erste_taetigkeitsstaette_id").order("name");
  const personen = (data ?? []) as Person[];
  const [{ data: standorte }, { data: vertretungen }] = await Promise.all([
    supabase.from("standort").select("id, name").eq("aktiv", true).order("sortierung").order("name"),
    supabase.from("vertretung").select("vertretene_id, vertreter_id, von, bis, bis_auf_weiteres"),
  ]);
  const vertretungVon = new Map(((vertretungen ?? []) as Vertretung[]).map((v) => [v.vertretene_id, v]));
  const heute = heuteBerlin();
  // Genehmigen kann jede Person außer Mitarbeiter/innen ohne weitere Rolle
  const t = (await ladeTexte()).einstellungen;
  const fuehrungskraefte = personen.filter((p) => p.rolle !== "mitarbeiter");

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 font-sans">
      <Link href="/einstellungen" className="text-sm text-neutral-600 underline dark:text-neutral-400">
        {t.seite.zurueck}
      </Link>
      <div>
        <h1 className="text-xl font-semibold">{t.personen.titel}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t.personen.text}</p>
        <p className="mt-1 text-sm text-neutral-500">
          {t.vertretung.titel}: {t.vertretung.personenText}
        </p>
      </div>
      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 px-4 dark:divide-neutral-800 dark:border-neutral-800">
        {personen.map((p) => (
          <div key={p.id}>
            <PersonZeile person={p} fuehrungskraefte={fuehrungskraefte} standorte={standorte ?? []} />
            {/* Vertretung nur für Personen, die genehmigen können */}
            {p.rolle !== "mitarbeiter" && (
              <VertretungFormular
                vertreteneId={p.id}
                vertretung={vertretungVon.get(p.id) ?? null}
                kandidaten={fuehrungskraefte.map((f) => ({ id: f.id, name: f.name }))}
                heute={heute}
              />
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
