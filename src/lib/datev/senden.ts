import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DATEV_MAX_BYTES } from "@/lib/mail/anhaenge";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { erzeugePdfMitBelegen } from "@/lib/pdf/abrechnung-pdf";
import { dateiBasis, ladeDokument } from "@/lib/pdf/dokument-laden";
import { protokolliereMail } from "@/lib/supabase/admin";
import { datevAdresseFuer } from "./adresse";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Schickt Abrechnung und Belege an die DATEV-Upload-Mail-Adresse. DATEV Unternehmen online legt
 * jeden Anhang als Beleg ab. Wird nach der Belegprüfung automatisch aufgerufen; nur mit
 * Buchhaltungsrechten möglich, da nur diese die Upload-Adresse lesen dürfen.
 */
export async function sendeAnDatev(supabase: SupabaseClient<Database>, reiseId: string): Promise<{ fehler?: string }> {
  let an: string[] = [];
  let betreff = "DATEV";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const protokoll = (status: "gesendet" | "fehler" | "nicht_eingerichtet", fehler = "") =>
    protokolliereMail({ reiseId, art: "datev", an, betreff, status, fehler, personId: user?.id });

  try {
    const geladen = await ladeDokument(supabase, reiseId);
    if (!geladen) return { fehler: "Reise nicht gefunden." };
    const { reise, dokument, dateien } = geladen;
    if (reise.status !== "geprueft" && reise.status !== "ausgezahlt") return { fehler: "Reise ist noch nicht geprüft." };

    const { data: intern } = await supabase
      .from("einstellungen_intern")
      .select("datev_upload_mail, datev_upload_mail_auslagen")
      .maybeSingle();
    const adresse = datevAdresseFuer(reise.art, intern);
    if (!adresse) return { fehler: "Keine DATEV-Upload-Mail-Adresse hinterlegt (Einstellungen)." };
    an = [adresse];

    const auslagen = reise.art === "auslagen";
    const basis = dateiBasis(reise.beleg_nr, dokument.reisende.name, reise.art);
    betreff = `${auslagen ? "Auslagen" : "Reisekosten"} ${reise.beleg_nr} ${dokument.reisende.name}`;
    const titel = auslagen ? "Auslagenabrechnung" : "Reisekostenabrechnung";

    if (!mailKonfiguration()) {
      await protokoll("nicht_eingerichtet");
      return { fehler: "E-Mail-Versand ist nicht eingerichtet." };
    }

    // Genau ein PDF je Abrechnung = ein Beleg in DATEV (Deckblatt + Originale)
    const { pdf, nichtEingebettet } = await erzeugePdfMitBelegen(dokument, dateien);
    if (pdf.byteLength > DATEV_MAX_BYTES) {
      const mb = (pdf.byteLength / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 });
      throw new Error(`Die Abrechnung ist mit ${mb} MB zu groß für DATEV (höchstens 14 MB) – bitte große PDF-Belege verkleinern.`);
    }
    const umfang = `${dokument.belege.length} ${dokument.belege.length === 1 ? "Position" : "Positionen"}, ${dateien.length} ${dateien.length === 1 ? "Originalbeleg" : "Originalbelege"} im PDF`;
    const hinweis = nichtEingebettet.length ? ` Beleg ${nichtEingebettet.join(", ")} konnte nicht eingebettet werden.` : "";

    await sendeMail({
      an,
      betreff,
      text: `${titel} ${reise.beleg_nr} (${dokument.reisende.name}): ${umfang}.${hinweis}`,
      html: `<p>${titel} ${escapeHtml(`${reise.beleg_nr} (${dokument.reisende.name})`)}: ${umfang}.${escapeHtml(hinweis)}</p>`,
      anhaenge: [{ name: `${basis}.pdf`, contentType: "application/pdf", inhalt: pdf }],
    });
    await protokoll("gesendet");
    return {};
  } catch (e) {
    const fehler = e instanceof Error ? e.message : String(e);
    console.error("DATEV-Versand fehlgeschlagen", e);
    await protokoll("fehler", fehler);
    return { fehler };
  }
}
