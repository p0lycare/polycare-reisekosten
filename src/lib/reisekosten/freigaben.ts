import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { genehmigungsrecht, heuteBerlin, vertreteneHeute, type Vertretung } from "./vertretung";

type Rolle = Database["public"]["Enums"]["rolle"];

export function istFreigebend(rolle: Rolle | undefined): boolean {
  return rolle === "freigeber" || rolle === "buchhaltung" || rolle === "admin";
}

/**
 * Offene Aufgaben der angemeldeten Person: zu genehmigende, zu prüfende und auszuzahlende Reisen.
 * Spiegelt die Regeln von darf_genehmigen/darf_pruefen in der Datenbank; die Datenbank prüft beim Ausführen erneut.
 */
export async function ladeAufgaben(supabase: SupabaseClient<Database>, userId: string, rolle: Rolle | undefined) {
  if (!istFreigebend(rolle)) return { genehmigen: [], pruefen: [], auszahlen: [], vertretene: [] as string[] };

  const [vertretene, { data: reisen }] = await Promise.all([
    ladeVertreteneHeute(supabase, userId),
    supabase
      .from("reise")
      .select("*, mitarbeiter:profile!reise_mitarbeiter_id_fkey(name, vorgesetzter_id, rolle)")
      .neq("mitarbeiter_id", userId)
      .in("status", ["eingereicht", "freigegeben", "geprueft"])
      .order("eingereicht_am"),
  ]);

  return { ...verteileAufgaben(reisen ?? [], userId, rolle, vertretene), vertretene };
}

/** Wen vertritt die Person heute? (ids der vertretenen genehmigenden Personen) */
export async function ladeVertreteneHeute(supabase: SupabaseClient<Database>, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("vertretung")
    .select("vertretene_id, vertreter_id, von, bis, bis_auf_weiteres")
    .eq("vertreter_id", userId);
  return vertreteneHeute((data ?? []) as Vertretung[], userId, heuteBerlin());
}

type AufgabenReise = {
  status: Database["public"]["Enums"]["reise_status"];
  mitarbeiter_id: string;
  freigeber_id: string | null;
  mitarbeiter: { vorgesetzter_id: string | null; rolle: Rolle } | null;
};

/** Zu genehmigende Reise; inVertretungFuer: id der vertretenen Person, wenn das Recht nur aus der Vertretung kommt */
export type ZuGenehmigen<R> = R & { inVertretungFuer: string | null };

/**
 * Ordnet offene Reisen den Aufgaben einer Person zu (auch für Erinnerungen ohne Anmeldung nutzbar).
 * vertretene: ids der genehmigenden Personen, die `userId` heute vertritt.
 */
export function verteileAufgaben<R extends AufgabenReise>(
  reisen: R[],
  userId: string,
  rolle: Rolle | undefined,
  vertretene: readonly string[] = [],
) {
  if (!istFreigebend(rolle)) return { genehmigen: [] as ZuGenehmigen<R>[], pruefen: [] as R[], auszahlen: [] as R[] };
  const alle = reisen.filter((r) => r.mitarbeiter_id !== userId);
  const buchhaltung = rolle === "buchhaltung" || rolle === "admin";

  const genehmigen: ZuGenehmigen<R>[] = [];
  for (const r of alle) {
    if (r.status !== "eingereicht") continue;
    const recht = genehmigungsrecht(
      { id: userId, rolle },
      { id: r.mitarbeiter_id, vorgesetzter_id: r.mitarbeiter?.vorgesetzter_id ?? null },
      vertretene,
    );
    if (recht.darf) genehmigen.push({ ...r, inVertretungFuer: recht.inVertretungFuer });
  }

  return {
    genehmigen,
    // Vier-Augen-Prinzip wie in reise_pruefen (Ausnahme: Reisen von Admin und Buchhaltung)
    pruefen: buchhaltung
      ? alle.filter((r) => r.status === "freigegeben" && (r.freigeber_id !== userId || r.mitarbeiter?.rolle === "admin" || r.mitarbeiter?.rolle === "buchhaltung"))
      : [],
    auszahlen: buchhaltung ? alle.filter((r) => r.status === "geprueft") : [],
  };
}

type OffenerVorschuss = {
  status: Database["public"]["Enums"]["vorschuss_status"];
  mitarbeiter_id: string;
  mitarbeiter: { vorgesetzter_id: string | null } | null;
};

/** Offene Vorschüsse einer Person: zu genehmigen (wie darf_genehmigen, auch in Vertretung) und auszuzahlen (Buchhaltung) */
export function verteileVorschuesse<V extends OffenerVorschuss>(
  liste: V[],
  userId: string,
  rolle: Rolle | undefined,
  vertretene: readonly string[] = [],
) {
  const fremde = liste.filter((v) => v.mitarbeiter_id !== userId);
  return {
    genehmigen: fremde.filter(
      (v) =>
        v.status === "beantragt" &&
        genehmigungsrecht({ id: userId, rolle }, { id: v.mitarbeiter_id, vorgesetzter_id: v.mitarbeiter?.vorgesetzter_id ?? null }, vertretene).darf,
    ),
    auszahlen: rolle === "buchhaltung" || rolle === "admin" ? fremde.filter((v) => v.status === "genehmigt") : [],
  };
}
