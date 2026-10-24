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

function amBuero(ort: string, bueroOrte: string[]): boolean {
  const klein = ort.toLowerCase();
  return bueroOrte.some((b) => b.trim() && klein.includes(b.trim().toLowerCase()));
}

function ueberschneidet(a: { beginn: string; ende: string }, b: { beginn: string; ende: string }): boolean {
  return a.beginn.slice(0, 10) <= b.ende.slice(0, 10) && b.beginn.slice(0, 10) <= a.ende.slice(0, 10);
}

/**
 * Termine, die nach Dienstreise aussehen: mit Ort, nicht online, nicht im Büro,
 * nicht abgesagt und noch nicht als Reise erfasst. Termine am selben Ort und Tag werden zusammengefasst.
 */
export function reiseVorschlaege(
  termine: Termin[],
  { bueroOrte, reisen }: { bueroOrte: string[]; reisen: { beginn: string; ende: string }[] },
): ReiseVorschlag[] {
  const vorschlaege: ReiseVorschlag[] = [];
  for (const t of [...termine].sort((a, b) => a.beginn.localeCompare(b.beginn))) {
    const ort = t.ort.trim();
    if (t.abgesagt || t.online || !ort || ONLINE.test(ort) || amBuero(ort, bueroOrte)) continue;
    const zeiten = reiseZeiten(t);
    if (reisen.some((r) => ueberschneidet(zeiten, r))) continue;

    const gleich = vorschlaege.find((v) => v.ort.toLowerCase() === ort.toLowerCase() && ueberschneidet(v, zeiten));
    if (gleich) {
      if (zeiten.ende > gleich.ende) gleich.ende = zeiten.ende;
      if (!gleich.betreff.includes(t.betreff)) gleich.betreff = `${gleich.betreff}; ${t.betreff}`;
      continue;
    }
    vorschlaege.push({ terminId: t.id, betreff: t.betreff.trim() || "Termin", ort, ...zeiten });
  }
  return vorschlaege;
}
