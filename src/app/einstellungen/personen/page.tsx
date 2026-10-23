import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PersonZeile, type Person } from "./person-zeile";

export default async function PersonenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: ich } = await supabase.from("profile").select("rolle").eq("id", user!.id).single();
  if (ich?.rolle !== "admin") redirect("/einstellungen");

  const { data } = await supabase.from("profile").select("id, name, email, rolle, vorgesetzter_id").order("name");
  const personen = (data ?? []) as Person[];
  const fuehrungskraefte = personen.filter((p) => p.rolle === "freigeber" || p.rolle === "admin");

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 font-sans">
      <Link href="/einstellungen" className="text-sm text-neutral-600 underline dark:text-neutral-400">
        ← Einstellungen
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Personen und Rollen</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Neue Kolleg:innen erscheinen hier nach ihrer ersten Anmeldung. Niemand kann eigene Reisen genehmigen oder
          prüfen.
        </p>
      </div>
      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 px-4 dark:divide-neutral-800 dark:border-neutral-800">
        {personen.map((p) => (
          <PersonZeile key={p.id} person={p} fuehrungskraefte={fuehrungskraefte} />
        ))}
      </div>
    </main>
  );
}
