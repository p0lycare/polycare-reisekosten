/** Kalendertermin, Zeiten lokal (Europe/Berlin) als "YYYY-MM-DDTHH:mm" */
export type Termin = {
  id: string;
  betreff: string;
  ort: string;
  beginn: string;
  ende: string;
  ganztaegig: boolean;
  online: boolean;
  abgesagt: boolean;
};

export type ReiseVorschlag = {
  terminId: string;
  betreff: string;
  ort: string;
  beginn: string;
  ende: string;
};

const ONLINE = /\b(teams|zoom|webex|skype|google meet|online|virtuell|telefon)/i;

/** Ganztägige Termine enden in Graph um 00:00 des Folgetags → letzter Tag 18:00, Beginn 08:00 */
export function reiseZeiten(t: Pick<Termin, "beginn" | "ende" | "ganztaegig">): { beginn: string; ende: string } {
  if (!t.ganztaegig) return { beginn: t.beginn, ende: t.ende };
  const [j, m, d] = t.ende.slice(0, 10).split("-").map(Number);
  const letzterTag = new Date(Date.UTC(j, m - 1, d - 1)).toISOString().slice(0, 10);
  const ende = letzterTag < t.beginn.slice(0, 10) ? t.beginn.slice(0, 10) : letzterTag;
  return { beginn: `${t.beginn.slice(0, 10)}T08:00`, ende: `${ende}T18:00` };
}

/**
 * Orte, zu denen eine Fahrt keine Reise ist: der eigene Wohnort und – wenn das Büro die erste
 * Tätigkeitsstätte ist – die Büro-Orte aus den Einstellungen.
 */
export function orteOhneReise({
  bueroOrte,
  wohnort,
  bueroIstTaetigkeitsstaette,
}: {
  bueroOrte: string[];
  wohnort: string | null | undefined;
  bueroIstTaetigkeitsstaette: boolean;
}): string[] {
  return [...(bueroIstTaetigkeitsstaette ? bueroOrte : []), ...(wohnort?.trim() ? [wohnort.trim()] : [])];
}

/** Ort fällt unter einen der Begriffe ("Messe Köln" ↔ "Köln", "Kassel" ↔ "34117 Kassel") */
function amBuero(ort: string, orte: string[]): boolean {
  const klein = ort.trim().toLowerCase();
  if (!klein) return false;
  return orte.some((b) => {
    const begriff = b.trim().toLowerCase();
    return !!begriff && (klein.includes(begriff) || (klein.length >= 3 && begriff.includes(klein)));
  });
}

function ueberschneidet(a: { beginn: string; ende: string }, b: { beginn: string; ende: string }): boolean {
  return a.beginn.slice(0, 10) <= b.ende.slice(0, 10) && b.beginn.slice(0, 10) <= a.ende.slice(0, 10);
}

// Fahrt-Termine ohne Ortsfeld, z. B. "Fahrt nach Kassel", "Anreise Berlin", "Rückfahrt nach Köln", "Flug MUC"
const REISE = /\b(fahrt|anfahrt|hinfahrt|anreise|abreise|rückfahrt|rueckfahrt|rückreise|heimfahrt|flug|rückflug|zug(fahrt)?|bahnfahrt|dienstreise|reise)\b/i;
const RUECKWEG = /\b(rückfahrt|rueckfahrt|rückreise|heimfahrt|rückflug|abreise)\b/i;
const ZIEL = /\bnach\s+([A-ZÄÖÜ][\wäöüß.-]*(?:[ -][A-ZÄÖÜ][\wäöüß.-]*)?)/;

/** Ziel aus dem Betreff ("Fahrt nach Kassel" → "Kassel") */
export function zielAus(betreff: string): string | null {
  return ZIEL.exec(betreff)?.[1]?.trim() ?? null;
}

function tagesAbstand(von: string, bis: string): number {
  return (Date.parse(bis.slice(0, 10)) - Date.parse(von.slice(0, 10))) / 864e5;
}

/**
 * Reisen aus Fahrt-Terminen: Hinweg ("Fahrt nach Kassel") bis Rückweg ("Rückfahrt nach Köln"), höchstens 7 Tage.
 * Termine dazwischen (nicht online) werden zur Begründung, das Ziel kommt aus "nach …".
 */
function fahrtVorschlaege(termine: Termin[], bueroOrte: string[]): ReiseVorschlag[] {
  const vorschlaege: ReiseVorschlag[] = [];
  let offen: (ReiseVorschlag & { fahrten: string[] }) | null = null;
  const schliessen = () => {
    if (!offen) return;
    const o: ReiseVorschlag & { fahrten: string[] } = offen;
    const dazwischen = termine
      .filter((t) => !o.fahrten.includes(t.id) && !t.abgesagt && !t.online && !ONLINE.test(t.ort) && !t.ganztaegig)
      .filter((t) => t.beginn >= o.beginn && t.ende <= o.ende)
      .map((t) => t.betreff.trim())
      .filter(Boolean);
    const { fahrten: _fahrten, ...vorschlag } = o;
    void _fahrten;
    vorschlaege.push({ ...vorschlag, betreff: dazwischen.length ? dazwischen.join("; ") : o.betreff });
    offen = null;
  };

  for (const t of termine) {
    if (t.abgesagt || t.online || t.ganztaegig || !REISE.test(t.betreff)) continue;
    const ziel = zielAus(t.betreff);
    const rueckweg = RUECKWEG.test(t.betreff) || (!!ziel && amBuero(ziel, bueroOrte));
    if (offen && tagesAbstand(offen.beginn, t.beginn) > 7) schliessen();

    if (!offen) {
      if (rueckweg) continue;
      offen = { terminId: t.id, betreff: `Reise nach ${ziel ?? t.ort.trim()}`.trim(), ort: ziel ?? t.ort.trim(), beginn: t.beginn, ende: t.ende, fahrten: [t.id] };
      continue;
    }
    offen.ende = t.ende > offen.ende ? t.ende : offen.ende;
    offen.fahrten.push(t.id);
    if (!offen.ort && ziel && !amBuero(ziel, bueroOrte)) offen.ort = ziel;
    if (rueckweg) schliessen();
  }
  schliessen();
  return vorschlaege.filter((v) => v.ort && !amBuero(v.ort, bueroOrte));
}

/**
 * Termine, die nach Dienstreise aussehen: Fahrt-Termine laut Betreff (s. o.) sowie Termine mit Ort –
 * nicht online, nicht im Büro, nicht abgesagt und noch nicht als Reise erfasst.
 * Termine am selben Ort und Tag bzw. innerhalb einer erkannten Fahrt werden zusammengefasst.
 */
export function reiseVorschlaege(
  termine: Termin[],
  { bueroOrte, reisen }: { bueroOrte: string[]; reisen: { beginn: string; ende: string }[] },
): ReiseVorschlag[] {
  const sortiert = [...termine].sort((a, b) => a.beginn.localeCompare(b.beginn));
  const vorschlaege = fahrtVorschlaege(sortiert, bueroOrte).filter((v) => !reisen.some((r) => ueberschneidet(v, r)));
  for (const t of sortiert) {
    const ort = t.ort.trim();
    if (t.abgesagt || t.online || !ort || ONLINE.test(ort) || amBuero(ort, bueroOrte)) continue;
    const zeiten = reiseZeiten(t);
    if (reisen.some((r) => ueberschneidet(zeiten, r))) continue;

    // Liegt der Termin in einer erkannten Fahrt oder am selben Ort und Tag, gehört er dazu
    const gleich = vorschlaege.find(
      (v) => ueberschneidet(v, zeiten) && (v.ort.toLowerCase() === ort.toLowerCase() || (zeiten.beginn >= v.beginn && zeiten.ende <= v.ende)),
    );
    if (gleich) {
      if (zeiten.ende > gleich.ende) gleich.ende = zeiten.ende;
      if (!gleich.betreff.includes(t.betreff)) gleich.betreff = `${gleich.betreff}; ${t.betreff}`;
      continue;
    }
    vorschlaege.push({ terminId: t.id, betreff: t.betreff.trim() || "Termin", ort, ...zeiten });
  }
  return vorschlaege.sort((a, b) => a.beginn.localeCompare(b.beginn));
}
