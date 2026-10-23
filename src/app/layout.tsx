import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <html lang="de">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {user && (
          <header className="border-b border-neutral-200 dark:border-neutral-800">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-3 font-sans">
              <Link href="/" className="font-semibold">
                Polycare Reisekosten
              </Link>
              <div className="flex items-center gap-3 text-sm">
                {(profil?.rolle === "admin" || profil?.rolle === "buchhaltung") && (
                  <Link href="/einstellungen" className="text-neutral-600 hover:underline dark:text-neutral-400">
                    Einstellungen
                  </Link>
                )}
                <Link href="/profil" className="text-neutral-600 hover:underline dark:text-neutral-400">
                  <span className="hidden sm:inline">{profil?.name ?? user.email}</span>
                  <span className="sm:hidden">Profil</span>
                  {profil?.rolle && profil.rolle !== "mitarbeiter" && (
                    <span className="ml-2 hidden rounded bg-neutral-100 px-2 py-0.5 sm:inline dark:bg-neutral-800">{profil.rolle}</span>
                  )}
                </Link>
                <form action="/auth/logout" method="post">
                  <button type="submit" className="text-neutral-600 underline dark:text-neutral-400">
                    Abmelden
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}
        {children}
      </body>
    </html>
  );
}
