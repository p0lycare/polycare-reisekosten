import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { MAX_ANHANG_BYTES_PRO_MAIL, type Anhang } from "@/lib/mail/anhaenge";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { erzeugePdfMitBelegen } from "@/lib/pdf/abrechnung-pdf";
import { dateiBasis, ladeDokument } from "@/lib/pdf/dokument-laden";

/**
 * Schickt Abrechnung und Belege an die DATEV-Upload-Mail-Adresse. DATEV Unternehmen online legt
 * jeden Anhang als Beleg ab. Wird nach der Belegprüfung automatisch aufgerufen; nur mit
 * Buchhaltungsrechten möglich, da nur diese die Upload-Adresse lesen dürfen.
 */
export async function sendeAnDatev(supabase: SupabaseClient<Database>, reiseId: string): Promise<{ fehler?: string }> {
  let an: string[] = [];
  let betreff = "DATEV";
  const protokoll = (status: string, fehler = "") =>
    supabase.rpc("mail_protokollieren", { p_reise: reiseId, p_art: "datev", p_an: an, p_betreff: betreff, p_status: status, p_fehler: fehler });

  try {
    const { data: intern } = await supabase.from("einstellungen_intern").select("datev_upload_mail").maybeSingle();
    if (!intern?.datev_upload_mail) return { fehler: "Keine DATEV-Upload-Mail-Adresse hinterlegt (Einstellungen)." };
    an = [intern.datev_upload_mail];

    const geladen = await ladeDokument(supabase, reiseId);
    if (!geladen) return { fehler: "Reise nicht gefunden." };
    const { reise, dokument, dateien } = geladen;
    if (reise.status !== "geprueft" && reise.status !== "ausgezahlt") return { fehler: "Reise ist noch nicht geprüft." };

    const basis = dateiBasis(reise.beleg_nr, dokument.reisende.name);
    betreff = `Reisekosten ${reise.beleg_nr} ${dokument.reisende.name}`;

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
      text: `Reisekostenabrechnung ${reise.beleg_nr} (${dokument.reisende.name}) mit ${dateien.length} Beleg(en).`,
      html: `<p>Reisekostenabrechnung ${reise.beleg_nr} (${dokument.reisende.name}) mit ${dateien.length} Beleg(en).</p>`,
      anhaenge,
    });
    await protokoll("gesendet");
    return {};
  } catch (e) {
    const fehler = e instanceof Error ? e.message : String(e);
    console.error("DATEV-Versand fehlgeschlagen", e);
    await protokoll("fehler", fehler).then(
      () => undefined,
      () => undefined,
    );
    return { fehler };
  }
}
