import { z } from "zod";

export type KategorieAuswahl = { id: string; bezeichnung: string; abschnitt: string; mwstProzent: number | null };

export function belegSchema(kategorien: KategorieAuswahl[]) {
  const ids = kategorien.map((k) => k.id) as [string, ...string[]];
  return z.object({
    ist_beleg: z.boolean().describe("false, wenn das Bild keine Quittung, Rechnung oder Fahrkarte ist"),
    haendler: z.string().nullable().describe("Name des Hotels, Restaurants, Tankstelle usw."),
    ort: z.string().nullable().describe("Stadt, in der die Leistung erbracht wurde, z. B. 'Berlin'"),
    datum: z.string().nullable().describe("Leistungs- bzw. Belegdatum im Format YYYY-MM-DD"),
    waehrung: z.string().describe("ISO-Währungscode, meist EUR"),
    positionen: z
      .array(
        z.object({
          kategorie_id: z.enum(ids),
          beschreibung: z.string().describe("kurz, z. B. 'Hotel Adler, 2 Nächte' oder 'ICE Köln–Berlin'"),
          betrag_brutto: z.number().describe("Bruttobetrag dieser Position in der Belegwährung"),
          mwst_prozent: z.number().describe("Steuersatz dieser Position laut Beleg, z. B. 19, 7 oder 0"),
        }),
      )
      .describe("Eine Position je Kategorie und Steuersatz. Die Summe muss dem Gesamtbetrag des Belegs entsprechen."),
    fruehstueck_enthalten: z.boolean().describe("true, wenn eine Hotelrechnung Frühstück enthält"),
    hinweis: z.string().nullable().describe("kurzer Hinweis bei Unklarheiten, sonst null"),
  });
}

export function anweisung(kategorien: KategorieAuswahl[]): string {
  const liste = kategorien
    .map((k) => `- ${k.id}: ${k.bezeichnung} (Abschnitt ${k.abschnitt}${k.mwstProzent != null ? `, üblich ${k.mwstProzent} %` : ""})`)
    .join("\n");
  return `Du liest Belege für eine deutsche Reisekostenabrechnung aus (Formblatt mit Abschnitten A Fahrtkosten, C Übernachtung, E Bewirtung, F Sonstiges).

Ordne jeden Betrag einer dieser Kategorien zu:
${liste}

Regeln:
- Hotelrechnungen aufteilen: Übernachtung (meist 7 %), Frühstück (19 %), Servicepauschale, Parken, Kurtaxe bzw. Beherbergungssteuer jeweils als eigene Position mit dem Steuersatz laut Rechnung.
- Restaurantrechnungen sind Bewirtungen; nimm die Kategorie mit dem passenden Steuersatz. Trinkgeld, das separat ausgewiesen ist, als eigene Position (Trinkgeld ohne MwSt).
- Bahn, Fernbus und Taxi bis 50 km: 7 %; Flug innerhalb Deutschlands: 19 %.
- Lies Beträge und Steuersätze vom Beleg ab; rate nicht. Wenn etwas unleserlich ist, sag es im Hinweis.
- Datum: Leistungsdatum, bei Hotels der Abreisetag laut Rechnung.`;
}
