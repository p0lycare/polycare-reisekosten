import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anweisung, belegSchema, type KategorieAuswahl } from "./beleg-schema";

export type { KategorieAuswahl };

export type AusgelesenerBeleg = {
  istBeleg: boolean;
  haendler: string | null;
  datum: string | null;
  waehrung: string;
  positionen: { kategorieId: string; beschreibung: string; betragCent: number; mwstProzent: number }[];
  fruehstueckEnthalten: boolean;
  hinweis: string | null;
};

export function kiVerfuegbar(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Liest ein Belegfoto oder Beleg-PDF mit Claude aus. Das Ergebnis ist ein Vorschlag;
 * die reisende Person prüft und bestätigt ihn im Formular.
 */
export async function belegAuslesen(
  datei: { inhalt: Uint8Array; contentType: string },
  kategorien: KategorieAuswahl[],
): Promise<AusgelesenerBeleg | { fehler: string }> {
  if (!kiVerfuegbar()) return { fehler: "Das Auslesen per KI ist noch nicht eingerichtet." };

  const daten = Buffer.from(datei.inhalt).toString("base64");
  const quelle: Anthropic.Beta.BetaContentBlockParam | null =
    datei.contentType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: daten } }
      : datei.contentType === "image/jpeg" || datei.contentType === "image/png" || datei.contentType === "image/webp"
        ? { type: "image", source: { type: "base64", media_type: datei.contentType, data: daten } }
        : null;
  if (!quelle) return { fehler: "Dieses Dateiformat kann nicht ausgelesen werden (bitte JPEG, PNG oder PDF)." };

  const client = new Anthropic();
  try {
    const antwort = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(belegSchema(kategorien)) },
      system: anweisung(kategorien),
      messages: [{ role: "user", content: [quelle, { type: "text", text: "Lies diesen Beleg aus." }] }],
    });

    if (antwort.stop_reason === "refusal") return { fehler: "Der Beleg konnte nicht ausgelesen werden." };
    const r = antwort.parsed_output;
    if (!r) return { fehler: "Der Beleg konnte nicht ausgelesen werden." };

    return {
      istBeleg: r.ist_beleg,
      haendler: r.haendler,
      datum: r.datum && /^\d{4}-\d{2}-\d{2}$/.test(r.datum) ? r.datum : null,
      waehrung: r.waehrung,
      positionen: r.positionen
        .filter((p) => p.betrag_brutto > 0)
        .map((p) => ({
          kategorieId: p.kategorie_id,
          beschreibung: p.beschreibung,
          betragCent: Math.round(p.betrag_brutto * 100),
          mwstProzent: p.mwst_prozent,
        })),
      fruehstueckEnthalten: r.fruehstueck_enthalten,
      hinweis: r.hinweis,
    };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { fehler: "Gerade sind zu viele Anfragen unterwegs – bitte gleich noch einmal versuchen." };
    if (e instanceof Anthropic.AuthenticationError) return { fehler: "Der KI-Zugang ist ungültig (API-Schlüssel prüfen)." };
    if (e instanceof Anthropic.APIError) {
      console.error("Belegauslesen fehlgeschlagen", e.status, e.message);
      return { fehler: "Der Beleg konnte gerade nicht ausgelesen werden." };
    }
    throw e;
  }
}
