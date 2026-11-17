import { createClient } from "@/lib/supabase/server";
import { ladeTexte } from "@/lib/i18n/server";
import { aktuellerMonatBerlin } from "@/lib/reisekosten/monat";
import { schritteFuer, type TourRolle } from "./schritte";
import { Tour } from "./tour";

const ROLLEN: TourRolle[] = ["mitarbeiter", "freigeber", "buchhaltung", "admin"];

/** Onboarding-Tour je Rolle; Admins können mit ?ansicht=… die Tour einer anderen Rolle ansehen */
export default async function TourPage({ searchParams }: { searchParams: Promise<{ ansicht?: string }> }) {
  const { ansicht } = await searchParams;
  const texte = await ladeTexte();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profile").select("rolle").eq("id", user!.id).single();
  const eigene = profil?.rolle ?? "mitarbeiter";
  const rolle = eigene === "admin" && ROLLEN.includes(ansicht as TourRolle) ? (ansicht as TourRolle) : eigene;

  // "Monat abrechnen" führt in den laufenden Monat
  const monat = aktuellerMonatBerlin();
  const schritte = schritteFuer(rolle, texte).map((s) => (s.link?.href === "/monat" ? { ...s, link: { ...s.link, href: `/monat/${monat}` } } : s));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 font-sans">
      <h1 className="sr-only">{texte.einfuehrung.tour.ueberschrift}</h1>
      <Tour schritte={schritte.map(({ id, titel, text, bild, link }) => ({ id, titel, text, bild, link }))} />
    </main>
  );
}
