import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Kopfzeile } from "./kopfzeile";
import { createClient } from "@/lib/supabase/server";
import { istFreigebend, ladeAufgaben } from "@/lib/reisekosten/freigaben";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polycare Reisekosten",
  description: "Dienstreisen erfassen, Belege hochladen, Pauschalen berechnen",
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
  const { data: profil } = user
    ? await supabase.from("profile").select("name, rolle").eq("id", user.id).single()
    : { data: null };
  const aufgaben = user ? await ladeAufgaben(supabase, user.id, profil?.rolle) : null;
  const offen = aufgaben ? aufgaben.genehmigen.length + aufgaben.pruefen.length + aufgaben.auszahlen.length : 0;

  return (
    <html lang="de">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {user && (
          <Kopfzeile
            daten={{
              name: profil?.name ?? user.email ?? "",
              rolle: profil?.rolle ?? null,
              offen,
              zeigeFreigaben: istFreigebend(profil?.rolle),
              zeigeEinstellungen: profil?.rolle === "admin" || profil?.rolle === "buchhaltung",
            }}
          />
        )}
        {children}
      </body>
    </html>
  );
}
