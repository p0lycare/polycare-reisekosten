/** Aufteilung eines Bruttobetrags (Cent) in Netto und MwSt wie im Formblatt: Netto = Brutto / (1 + Satz). */
export function nettoAusBrutto(bruttoCent: number, mwstProzent: number): { netto: number; mwst: number } {
  if (mwstProzent < 0 || mwstProzent >= 100) throw new Error("Ungültiger MwSt-Satz");
  const netto = Math.round((bruttoCent * 100) / (100 + mwstProzent));
  return { netto, mwst: bruttoCent - netto };
}
