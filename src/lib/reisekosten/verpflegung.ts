import { pauschaleFuer, type Pauschale } from "./laender";

/** Vom Arbeitgeber oder auf seine Veranlassung gestellte Mahlzeiten an einem Tag. */
export type Mahlzeiten = {
  fruehstueck?: boolean;
  mittag?: boolean;
  abend?: boolean;
  /** Abweichendes Land an diesem Tag (Reisen durch mehrere Staaten), sonst gilt das Reiseland */
  land?: string;
};

export type VerpflegungInput = {
  /** Lokale Zeit ohne Zeitzone, z. B. "2026-10-23T07:30" */
  beginn: string;
  ende: string;
  /** Reiseland: "DE", ISO-Code oder "ISO:Stadt" (siehe laender.ts), Standard "DE" */
  land?: string;
  /** Übernachtung auswärts? Bei false werden Reisen über Mitternacht zusammengerechnet. */
  mitUebernachtung?: boolean;
  /** Gestellte Mahlzeiten und ggf. abweichendes Land je Kalendertag ("YYYY-MM-DD") */
  mahlzeiten?: Record<string, Mahlzeiten>;
};

export type VerpflegungTag = {
  datum: string;
  art: "voll" | "klein" | "keine";
  pauschale: number;
  kuerzung: number;
  betrag: number;
};

export type VerpflegungErgebnis = {
  tage: VerpflegungTag[];
  summe: number;
};

const STUNDE_MS = 60 * 60 * 1000;

function parseLokal(wert: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wert);
  if (!m) throw new Error(`Ungültiges Datum "${wert}", erwartet YYYY-MM-DDTHH:mm`);
  const [, j, mo, t, h, mi] = m.map(Number);
  // UTC als neutrale Rechenbasis, damit Sommerzeitwechsel keine Stunde verschluckt
  return new Date(Date.UTC(j, mo - 1, t, h, mi));
}

function datumKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mitternachtDanach(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
}

/** Kürzung nach § 9 Abs. 4a Satz 8 EStG: 20 % Frühstück, je 40 % Mittag/Abend der vollen Pauschale. */
function kuerzungFuer(m: Mahlzeiten | undefined, p: Pauschale): number {
  if (!m) return 0;
  let k = 0;
  if (m.fruehstueck) k += Math.round(p.voll * 0.2);
  if (m.mittag) k += Math.round(p.voll * 0.4);
  if (m.abend) k += Math.round(p.voll * 0.4);
  return k;
}

/**
 * Pauschale eines Kalendertags. Bei Reisen durch mehrere Staaten gilt je Tag das dort angegebene Land
 * (BMF: An-/Zwischentage = Ort, der vor 24 Uhr erreicht wird; Abreisetag = letzter Tätigkeitsort).
 * Die Kürzung für gestellte Mahlzeiten richtet sich nach der vollen Pauschale desselben Tages.
 */
function tag(
  datum: string,
  art: VerpflegungTag["art"],
  reiseland: string,
  mahlzeiten: VerpflegungInput["mahlzeiten"],
): VerpflegungTag {
  const p = pauschaleFuer(mahlzeiten?.[datum]?.land || reiseland, Number(datum.slice(0, 4)));
  const pauschale = art === "voll" ? p.voll : art === "klein" ? p.klein : 0;
  const kuerzung = Math.min(pauschale, kuerzungFuer(mahlzeiten?.[datum], p));
  return { datum, art, pauschale, kuerzung, betrag: pauschale - kuerzung };
}

/**
 * Berechnet die Verpflegungsmehraufwendungen einer Dienstreise (Beträge in Cent).
 * Die Dreimonatsfrist wird hier nicht geprüft.
 */
export function berechneVerpflegung(input: VerpflegungInput): VerpflegungErgebnis {
  const beginn = parseLokal(input.beginn);
  const ende = parseLokal(input.ende);
  if (ende <= beginn) throw new Error("Ende muss nach dem Beginn liegen");

  const land = input.land ?? "DE";
  const mitUebernachtung = input.mitUebernachtung ?? true;

  // Kalendertage mit jeweiliger Abwesenheitsdauer
  const abschnitte: { datum: string; stunden: number }[] = [];
  for (let von = beginn; von < ende; ) {
    const bis = new Date(Math.min(mitternachtDanach(von).getTime(), ende.getTime()));
    abschnitte.push({ datum: datumKey(von), stunden: (bis.getTime() - von.getTime()) / STUNDE_MS });
    von = bis;
  }

  let tage: VerpflegungTag[];

  if (abschnitte.length === 1) {
    const [a] = abschnitte;
    tage = [tag(a.datum, a.stunden > 8 ? "klein" : "keine", land, input.mahlzeiten)];
  } else if (!mitUebernachtung) {
    // Ohne Übernachtung über Mitternacht: Abwesenheit zusammenrechnen und dem
    // Tag mit der überwiegenden Abwesenheit zuordnen (§ 9 Abs. 4a Satz 3 Nr. 3 EStG).
    if (abschnitte.length > 2) {
      throw new Error("Reisen über mehr als zwei Kalendertage erfordern eine Übernachtung");
    }
    const gesamt = abschnitte.reduce((s, a) => s + a.stunden, 0);
    const haupt = abschnitte[0].stunden > abschnitte[1].stunden ? 0 : 1;
    tage = abschnitte.map((a, i) =>
      tag(a.datum, i === haupt && gesamt > 8 ? "klein" : "keine", land, input.mahlzeiten),
    );
  } else {
    const letzter = abschnitte.length - 1;
    tage = abschnitte.map((a, i) =>
      tag(a.datum, i === 0 || i === letzter ? "klein" : "voll", land, input.mahlzeiten),
    );
  }

  return { tage, summe: tage.reduce((s, t) => s + t.betrag, 0) };
}
