import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Kopfzeile } from "./kopfzeile";
import { BereichProvider } from "./bereich";
import { ServiceWorker } from "./service-worker";
import { createClient } from "@/lib/supabase/server";
import { istFreigebend, ladeAufgaben, verteileVorschuesse } from "@/lib/reisekosten/freigaben";
import "./globals.css";

// Inter als frei verfügbare Nähe zur Hausschrift TT Interphases
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polycare Reisekosten",
  description: "Dienstreisen erfassen, Belege hochladen, Pauschalen berechnen",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Profil zuerst (Rolle bestimmt, was geladen wird), danach alles Weitere gleichzeitig
  const { data: profil } = user
    ? await supabase.from("profile").select("name, rolle").eq("id", user.id).single()
    : { data: null };
  const freigebend = !!user && istFreigebend(profil?.rolle);
  const [aufgaben, { data: vorschuesse }, { count: eingang }] = user
    ? await Promise.all([
        ladeAufgaben(supabase, user.id, profil?.rolle),
        freigebend
          ? supabase
              .from("vorschuss")
              .select("status, mitarbeiter_id, mitarbeiter:profile!vorschuss_mitarbeiter_id_fkey(vorgesetzter_id)")
              .in("status", ["beantragt", "genehmigt"])
          : Promise.resolve({ data: [] }),
        supabase.from("beleg_eingang").select("id", { count: "exact", head: true }).eq("mitarbeiter_id", user.id),
      ])
    : [null, { data: [] }, { count: 0 }];
  const vorschussAufgaben = user ? verteileVorschuesse(vorschuesse ?? [], user.id, profil?.rolle) : null;
  const offen =
    (aufgaben ? aufgaben.genehmigen.length + aufgaben.pruefen.length + aufgaben.auszahlen.length : 0) +
    (vorschussAufgaben ? vorschussAufgaben.genehmigen.length + vorschussAufgaben.auszahlen.length : 0);

  return (
    <html lang="de">
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <BereichProvider>
          {user && (
            <Kopfzeile
              daten={{
                name: profil?.name ?? user.email ?? "",
                rolle: profil?.rolle ?? null,
                offen,
                eingang: eingang ?? 0,
                zeigeFreigaben: istFreigebend(profil?.rolle),
                zeigeEinstellungen: profil?.rolle === "admin" || profil?.rolle === "buchhaltung",
              }}
            />
          )}
          {children}
        </BereichProvider>
        {user && <ServiceWorker />}
      </body>
    </html>
  );
}
