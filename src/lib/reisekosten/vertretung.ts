import type { Database } from "@/lib/supabase/database.types";

type Rolle = Database["public"]["Enums"]["rolle"];

/** Vertretung einer genehmigenden Person (Tabelle vertretung, Migration 0043) */
export type Vertretung = {
  vertretene_id: string;
  vertreter_id: string;
  /** "2026-12-20" */
  von: string;
  bis: string | null;
  bis_auf_weiteres: boolean;
};

/** Heutiger Kalendertag in Deutschland, "2026-11-19" – wie heute_berlin() in der Datenbank */
export function heuteBerlin(jetzt: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(jetzt);
}

/** Gilt die Vertretung an diesem Tag? Beide Grenzen zählen mit (ganztägig). */
export function istAktiv(v: Pick<Vertretung, "von" | "bis" | "bis_auf_weiteres">, heute: string): boolean {
  if (v.von > heute) return false;
  return v.bis_auf_weiteres || (v.bis !== null && v.bis >= heute);
}

/** Personen, die `vertreterId` heute vertritt (ids der Vertretenen) */
export function vertreteneHeute(vertretungen: Vertretung[], vertreterId: string, heute: string): string[] {
  return vertretungen.filter((v) => v.vertreter_id === vertreterId && istAktiv(v, heute)).map((v) => v.vertretene_id);
}

export type Genehmigungsrecht = { darf: false } | { darf: true; inVertretungFuer: string | null };

/**
 * Darf `ich` die Abrechnung (oder den Vorschuss) von `mitarbeiter` genehmigen? Spiegelt darf_genehmigen
 * und genehmigt_in_vertretung_fuer in der Datenbank (Migration 0043); die Datenbank prüft beim Ausführen erneut.
 *
 * - Nie die eigene Abrechnung (Vier-Augen) – auch nicht in Vertretung.
 * - Aus eigenem Recht: eingetragene genehmigende Person („Genehmigt durch“), Admins, und ohne Eintrag jede Führungskraft.
 * - In Vertretung: wer die eingetragene genehmigende Person heute vertritt (Rolle ≠ Mitarbeiter/in).
 *   Eigenes Recht geht vor, dann steht kein „in Vertretung für“ im Verlauf.
 */
export function genehmigungsrecht(
  ich: { id: string; rolle: Rolle | undefined },
  mitarbeiter: { id: string; vorgesetzter_id: string | null },
  vertreteneIds: readonly string[] = [],
): Genehmigungsrecht {
  if (!ich.rolle || ich.id === mitarbeiter.id) return { darf: false };
  const vorgesetzt = mitarbeiter.vorgesetzter_id;
  if (vorgesetzt === ich.id || ich.rolle === "admin" || (ich.rolle === "freigeber" && !vorgesetzt)) {
    return { darf: true, inVertretungFuer: null };
  }
  if (vorgesetzt && ich.rolle !== "mitarbeiter" && vertreteneIds.includes(vorgesetzt)) {
    return { darf: true, inVertretungFuer: vorgesetzt };
  }
  return { darf: false };
}

/**
 * Rückfall-Hinweis: Reicht die Vertretung selbst ein, kann sie nicht genehmigen. Zuständig bleiben
 * die vertretene Person und die Admins (die bekommen dann zusätzlich die Mail, siehe mail_empfaenger).
 */
export function brauchtRueckfall(
  mitarbeiter: { id: string; vorgesetzter_id: string | null },
  vertretungen: Vertretung[],
  heute: string,
): boolean {
  const vorgesetzt = mitarbeiter.vorgesetzter_id;
  if (!vorgesetzt) return false;
  return vertretungen.some((v) => v.vertretene_id === vorgesetzt && v.vertreter_id === mitarbeiter.id && istAktiv(v, heute));
}

/** Prüft die Eingaben für eine Vertretung; gibt einen Fehlerschlüssel zurück oder null */
export function pruefeVertretung(e: {
  vertreteneId: string;
  vertreterId: string;
  von: string;
  bis: string | null;
  bisAufWeiteres: boolean;
}): "selbst" | "von" | "bis" | "reihenfolge" | null {
  const datum = /^\d{4}-\d{2}-\d{2}$/;
  if (e.vertreterId === e.vertreteneId) return "selbst";
  if (!datum.test(e.von)) return "von";
  if (e.bisAufWeiteres) return null;
  if (!e.bis || !datum.test(e.bis)) return "bis";
  if (e.bis < e.von) return "reihenfolge";
  return null;
}
