import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { MAX_ANHANG_BYTES_PRO_MAIL, type Anhang } from "@/lib/mail/anhaenge";
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

    const { teile, separat } = await erzeugePdfMitBelegen(dokument, dateien, MAX_ANHANG_BYTES_PRO_MAIL);
    const anhaenge: Anhang[] = [
      ...teile.map((inhalt, i) => ({
        name: teile.length > 1 ? `${basis}_Teil${i + 1}.pdf` : `${basis}.pdf`,
        contentType: "application/pdf",
        inhalt,
      })),
      ...separat.map((d) => ({ name: `${basis}_${d.name}`, contentType: d.contentType, inhalt: d.inhalt })),
    ];

    await sendeMail({
      an,
      betreff,
      text: `${titel} ${reise.beleg_nr} (${dokument.reisende.name}) mit ${dateien.length} Beleg(en).`,
      html: `<p>${titel} ${escapeHtml(`${reise.beleg_nr} (${dokument.reisende.name})`)} mit ${dateien.length} Beleg(en).</p>`,
      anhaenge,
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
