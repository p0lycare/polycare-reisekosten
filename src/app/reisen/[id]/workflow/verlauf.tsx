import { createClient } from "@/lib/supabase/server";

const AKTION_TEXT: Record<string, string> = {
  eingereicht: "Eingereicht – für die Richtigkeit bestätigt",
  genehmigt: "Genehmigt",
  abgelehnt: "Abgelehnt",
  geprueft: "Belege geprüft",
  ausgezahlt: "Ausgezahlt",
};

const zeitFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

export async function Verlauf({ reiseId }: { reiseId: string }) {
  const supabase = await createClient();
  const { data: ereignisse } = await supabase
    .from("reise_ereignis")
    .select("id, zeit, aktion, kommentar, person_name")
    .eq("reise_id", reiseId)
    .order("zeit");

  if (!ereignisse?.length) return null;

  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Verlauf</h2>
      <ol className="mt-2 flex flex-col gap-2 text-sm">
        {ereignisse.map((e) => (
          <li key={e.id} className="flex flex-wrap gap-x-2">
            <span className="text-neutral-500 tabular-nums">{zeitFormat.format(new Date(e.zeit))}</span>
            <span>{AKTION_TEXT[e.aktion] ?? e.aktion}</span>
            <span className="text-neutral-500">· {e.person_name}</span>
            {e.kommentar && (
              <span className="w-full text-neutral-600 dark:text-neutral-400">
                {e.aktion === "geprueft" ? `Beleg-Nr. ${e.kommentar}` : `„${e.kommentar}“`}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
