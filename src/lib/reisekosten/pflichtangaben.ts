/**
 * Pflichtangaben je Beleg: Was ein fremder Dritter (z. B. die Betriebsprüfung) braucht, um eine Ausgabe
 * nachzuvollziehen. Welche Kategorie was verlangt, steht in kategorie.pflichtangaben (Einstellungen).
 */
export const PFLICHTANGABEN = ["anlass", "person", "kfz"] as const;
export type Pflichtangabe = (typeof PFLICHTANGABEN)[number];

export type Angaben = { anlass: string | null; person: string | null; kfzKennzeichen: string | null };

/** Bezeichnung im Formular – der Anlass heißt je nach Abschnitt anders */
export function angabeLabel(angabe: Pflichtangabe, abschnitt: string): string {
  if (angabe === "person") return abschnitt === "C" ? "Wer hat übernachtet?" : "Person";
  if (angabe === "kfz") return "Kfz-Kennzeichen";
  return abschnitt === "C" ? "Anlass der Übernachtung" : abschnitt === "A" ? "Anlass der Fahrt" : "Anlass";
}

export function angabeHinweis(angabe: Pflichtangabe, abschnitt: string): string {
  if (angabe === "person") return "Name, bei mehreren Personen alle";
  if (angabe === "kfz") return "auch beim Mietwagen";
  return abschnitt === "C" ? "z. B. Meeting mit Kunde X in Berlin" : "z. B. Fahrt Köln – Kassel, Kundentermin";
}

export function istPflichtangabe(wert: string): wert is Pflichtangabe {
  return (PFLICHTANGABEN as readonly string[]).includes(wert);
}

/** Pflichtangaben der Kategorie, die im Beleg fehlen */
export function fehlendeAngaben(pflicht: readonly string[], angaben: Angaben): Pflichtangabe[] {
  const wert: Record<Pflichtangabe, string | null> = { anlass: angaben.anlass, person: angaben.person, kfz: angaben.kfzKennzeichen };
  return pflicht.filter(istPflichtangabe).filter((a) => !wert[a]?.trim());
}

/** Vorbelegung aus der Reise: Anlass der Reise, die reisende Person, das Kennzeichen des eigenen PKW */
export function vorbelegung(reise: { begruendung: string; reiseweg: string; kfz_kennzeichen: string | null }, name: string): Angaben {
  return {
    anlass: [reise.begruendung, reise.reiseweg].filter(Boolean).join(" – ") || null,
    person: name || null,
    kfzKennzeichen: reise.kfz_kennzeichen,
  };
}

/** Nur die Angaben, die die Kategorie verlangt (andere werden nicht gespeichert) */
export function nurPflichtangaben(pflicht: readonly string[], angaben: Angaben): Angaben {
  const mit = (a: Pflichtangabe, w: string | null) => (pflicht.includes(a) && w?.trim() ? w.trim() : null);
  return {
    anlass: mit("anlass", angaben.anlass)?.slice(0, 300) ?? null,
    person: mit("person", angaben.person)?.slice(0, 200) ?? null,
    kfzKennzeichen: mit("kfz", angaben.kfzKennzeichen)?.slice(0, 20) ?? null,
  };
}

/** Datenbankspalten für die Pflichtangaben – nur, was die Kategorie verlangt */
export function angabenSpalten(pflicht: readonly string[], angaben: Angaben) {
  const a = nurPflichtangaben(pflicht, angaben);
  return { anlass: a.anlass, person: a.person, kfz_kennzeichen: a.kfzKennzeichen };
}

/** Eine Zeile für PDF und Belegliste, z. B. "Übernachtung: Erika Muster · Anlass: Messe" */
export function angabenText(b: {
  anlass?: string | null;
  person?: string | null;
  kfzKennzeichen?: string | null;
  bewirtungAnlass?: string | null;
  bewirtungTeilnehmer?: string | null;
}): string {
  return [
    b.person && `Person: ${b.person}`,
    b.anlass && `Anlass: ${b.anlass}`,
    b.kfzKennzeichen && `Kfz: ${b.kfzKennzeichen}`,
    b.bewirtungAnlass && `Anlass: ${b.bewirtungAnlass}`,
    b.bewirtungTeilnehmer && `Bewirtet: ${b.bewirtungTeilnehmer}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Für die Plausibilitätsprüfung: Bezeichnungen der fehlenden Angaben eines gespeicherten Belegs */
export function fehlendeAngabenText(b: {
  anlass: string | null;
  person: string | null;
  kfz_kennzeichen: string | null;
  kategorie: { abschnitt: string; pflichtangaben: string[] } | null;
}): string[] {
  if (!b.kategorie) return [];
  return fehlendeAngaben(b.kategorie.pflichtangaben, { anlass: b.anlass, person: b.person, kfzKennzeichen: b.kfz_kennzeichen }).map((a) =>
    angabeLabel(a, b.kategorie!.abschnitt),
  );
}
