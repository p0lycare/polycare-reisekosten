import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Offizielle Unterlagen bleiben deutsch: Abrechnungs-PDF und DATEV-Versand dürfen nicht von der
 * Spracheinstellung der Person abhängen. Die Tests stellen die Oberfläche auf Englisch (Cookie)
 * und prüfen, dass Deckblatt und DATEV-Mail trotzdem deutsch sind.
 */

vi.mock("server-only", () => ({}));
// Englische Spracheinstellung, wie sie der Sprachumschalter im Cookie ablegt
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "sprache" ? { name, value: "en" } : undefined), getAll: () => [], set: () => {} }),
  headers: async () => new Headers({ host: "example.invalid" }),
}));
const gesendet = vi.hoisted(() => [] as { an: string[]; betreff: string; text: string; html: string; anhaenge?: { name: string }[] }[]);
vi.mock("@/lib/mail/graph", () => ({
  mailKonfiguration: () => ({}),
  sendeMail: async (m: (typeof gesendet)[number]) => {
    gesendet.push(m);
  },
}));
vi.mock("@/lib/supabase/admin", () => ({ protokolliereMail: async () => {} }));
// ladeSprache fragt ohne Cookie das Profil ab – hier liefert das Cookie die Sprache
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeSupabase() }));

// Erfundene Testdaten
const TABELLEN: Record<string, unknown[]> = {
  reise: [
    {
      id: "r1",
      art: "reise",
      status: "geprueft",
      beleg_nr: "RK-2026-0001",
      buchungsmonat: "2026-10-01",
      mitarbeiter_id: "p1",
      kostenstelle: "100",
      begruendung: "Messe",
      reiseweg: "Köln – Paris – Köln",
      land: "FR",
      besuchte_stellen: "Beispiel SA",
      beginn: "2026-10-21T07:00:00",
      ende: "2026-10-23T18:00:00",
      mit_uebernachtung: true,
      verkehrsmittel: ["eisenbahn", "eigener_pkw", "mitfahrt"],
      kfz_kennzeichen: "K-AB 123",
      mitfahrt_bei: "Max Beispiel",
      mahlzeiten: { "2026-10-22": { fruehstueck: true, mittag: false, abend: false } },
      verpflegung_fest: null,
      verpflegung_bemerkung: null,
      projekt_id: null,
      km_satz_cent: 30,
      km_steuerfrei_cent: 30,
      vorschuss_cent: 0,
    },
  ],
  profile: [{ id: "p1", name: "Erika Muster", sprache: "en" }],
  profil_privat: [{ personalnummer: "0815", wohnort: "Musterstadt" }],
  fahrt: [{ datum: "2026-10-21", strecke: "Köln – Essen", zweck: null, km: 63 }],
  beleg: [
    {
      kategorie_id: "bahn",
      datum: "2026-10-21",
      beschreibung: null,
      betrag_cent: 8990,
      mwst_prozent: 7,
      datei_pfad: null,
      created_at: "2026-10-21T10:00:00",
      lieferant: null,
      kostenstelle: null,
      zahlungsart: null,
      anlass: "Messe",
      person: "Erika Muster",
      kfz_kennzeichen: null,
      bewirtung_anlass: null,
      bewirtung_teilnehmer: null,
      kategorie: { abschnitt: "A", bezeichnung: "Zugticket", konto: "4670" },
    },
  ],
  reise_ereignis: [{ zeit: "2026-10-24T09:00:00Z", aktion: "eingereicht", person_name: "Erika Muster", kommentar: null }],
  einstellungen: [{ km_satz_cent: 30, km_steuerfrei_cent: 30 }],
  kategorie: [
    { id: "km_geld", bezeichnung: "Km-Geld bei Privatwagen", konto: "4673" },
    { id: "verpflegung", bezeichnung: "Verpflegungspauschale", konto: "4674" },
  ],
  einstellungen_intern: [{ datev_upload_mail: "datev@example.invalid", datev_upload_mail_auslagen: null }],
};

/** Minimaler Supabase-Ersatz: jede Abfrage liefert die Zeilen der Tabelle, Filter werden ignoriert */
function fakeSupabase() {
  const abfrage = (tabelle: string) => {
    const zeilen = TABELLEN[tabelle] ?? [];
    const kette: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order", "limit"]) kette[m] = () => kette;
    kette.single = async () => ({ data: zeilen[0] ?? null, error: null });
    kette.maybeSingle = async () => ({ data: zeilen[0] ?? null, error: null });
    kette.then = (ok: (w: unknown) => unknown) => ok({ data: zeilen, error: null });
    return kette;
  };
  return {
    from: abfrage,
    auth: { getUser: async () => ({ data: { user: { id: "p1", email: "erika@example.invalid" } } }) },
    storage: { from: () => ({ download: async () => ({ data: null }) }) },
  } as never;
}

/** Text aller Seiten eines mit pdf-lib erzeugten PDFs (Standardschrift, WinAnsi als Hex-Strings) */
function pdfText(bytes: Uint8Array): string {
  const roh = Buffer.from(bytes).toString("latin1");
  const teile: string[] = [];
  for (const m of roh.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    let inhalt: string;
    try {
      inhalt = inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
    } catch {
      inhalt = m[1];
    }
    for (const hex of inhalt.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) teile.push(Buffer.from(hex[1], "hex").toString("latin1"));
  }
  return teile.join("\n");
}

beforeEach(() => {
  gesendet.length = 0;
});

describe("Offizielle Unterlagen bei englischer Spracheinstellung", () => {
  it("die Oberfläche ist tatsächlich auf Englisch gestellt", async () => {
    const { ladeSprache, ladeTexte } = await import("@/lib/i18n/server");
    expect(await ladeSprache()).toBe("en");
    expect((await ladeTexte()).allgemein.status.geprueft).toBe("Checked");
  });

  it("das Deckblatt-Dokument ist deutsch", async () => {
    const { ladeDokument } = await import("./dokument-laden");
    const geladen = await ladeDokument(fakeSupabase(), "r1");
    const d = geladen!.dokument;

    expect(d.monat).toBe("Oktober 2026");
    expect(d.ausland).toBe("Frankreich – im Übrigen");
    expect(d.verkehrsmittel).toBe("Eisenbahn, Eigener PKW (K-AB 123), Mitfahrt bei Max Beispiel");
    expect(d.belege[0].kategorie).toBe("Zugticket");
    expect(d.belege[0].angaben).toEqual(["Person: Erika Muster", "Anlass: Messe"]);
    expect(d.verlauf[0].aktion).toBe("Für die Richtigkeit (eingereicht)");
    expect(d.verpflegung.map((v) => v.art)).toContain("24 Stunden");
    const positionen = d.abrechnung.abschnitte.flatMap((a) => a.positionen.map((p) => p.bezeichnung));
    expect(positionen).toEqual(expect.arrayContaining(["Zugticket", "Km-Geld bei Privatwagen", "Verpflegungspauschale", "Gestellte Mahlzeiten"]));
  });

  it("das PDF ist deutsch (Formblatt FB 06, Abschnitte, Kategorien)", async () => {
    const { ladeDokument } = await import("./dokument-laden");
    const { erzeugeAbrechnungsPdf } = await import("./abrechnung-pdf");
    const geladen = await ladeDokument(fakeSupabase(), "r1");
    const pdf = await erzeugeAbrechnungsPdf(geladen!.dokument);
    const text = pdfText(await pdf.save());

    expect(text).toContain("Reisekostenabrechnung");
    for (const deutsch of ["Fahrtkosten", "Verpflegungskosten pauschal", "Abzüglich Verpflegungspauschale", "Zugticket", "Eisenbahn", "Frankreich", "Für die Richtigkeit"]) {
      expect(text).toContain(deutsch);
    }
    for (const englisch of ["Travel costs", "Meal allowance", "Train ticket", "Expense report", "France", "Submitted"]) {
      expect(text).not.toContain(englisch);
    }
  });

  it("die DATEV-Mail ist deutsch", async () => {
    const { sendeAnDatev } = await import("@/lib/datev/senden");
    expect(await sendeAnDatev(fakeSupabase(), "r1")).toEqual({});
    expect(gesendet).toHaveLength(1);
    const [mail] = gesendet;
    expect(mail.an).toEqual(["datev@example.invalid"]);
    expect(mail.betreff).toBe("Reisekosten RK-2026-0001 Erika Muster");
    expect(mail.text).toMatch(/^Reisekostenabrechnung RK-2026-0001 \(Erika Muster\): 1 Position, 0 Originalbelege im PDF\.$/);
    expect(mail.anhaenge?.map((a) => a.name)).toEqual(["RK-2026-0001_Reisekosten_Erika_Muster.pdf"]);
  });

  it("PDF- und DATEV-Code greifen nicht auf die Übersetzungen zu", () => {
    const ordner = ["src/lib/pdf", "src/lib/datev"];
    for (const o of ordner) {
      for (const datei of readdirSync(o).filter((d) => d.endsWith(".ts") && !d.endsWith(".test.ts"))) {
        expect(readFileSync(join(o, datei), "utf8"), `${o}/${datei}`).not.toMatch(/@\/lib\/i18n|ladeSprache|ladeTexte/);
      }
    }
  });
});
