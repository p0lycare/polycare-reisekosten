/** "2026-10" → { von: "2026-10-01", bis: "2026-11-01" } für Abfragen auf das Buchungsmonat */
export function monatsgrenzen(monat: string): { von: string; bis: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monat);
  if (!m) return null;
  const jahr = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) return null;
  const folge = mon === 12 ? `${jahr + 1}-01` : `${jahr}-${String(mon + 1).padStart(2, "0")}`;
  return { von: `${monat}-01`, bis: `${folge}-01` };
}
