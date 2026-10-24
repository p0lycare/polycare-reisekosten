import { createClient } from "@/lib/supabase/server";
import { MeldeFormular } from "./formular";
import { MeldungsListe } from "./liste";

/** Fehler, Wünsche und Fragen melden; die eigenen Meldungen mit Stand */
export default async function MeldenPage({ searchParams }: { searchParams: Promise<{ von?: string }> }) {
  const { von } = await searchParams;
  const seite = von && von.startsWith("/") && !von.startsWith("/melden") ? von.slice(0, 300) : "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: meldungen } = await supabase
    .from("meldung")
    .select("id, art, text, seite, status, notiz, erstellt_am")
    .eq("person_id", user!.id)
    .order("erstellt_am", { ascending: false })
    .limit(20);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6 font-sans">
      <div>
        <h1 className="text-xl font-semibold">Feedback</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Etwas klemmt, rechnet falsch oder könnte einfacher sein? Schreib es hier – die Admins bekommen eine Mail und kümmern sich
          darum.
        </p>
      </div>
      <MeldeFormular seite={seite} />
      {!!meldungen?.length && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Deine Meldungen</h2>
          <MeldungsListe meldungen={meldungen} />
        </section>
      )}
    </main>
  );
}
