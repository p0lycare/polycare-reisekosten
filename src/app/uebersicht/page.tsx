import { redirect } from "next/navigation";

/** Ohne Monat: aktueller Monat in deutscher Zeit */
export default function UebersichtStart() {
  const monat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).format(new Date());
  redirect(`/uebersicht/${monat}`);
}
