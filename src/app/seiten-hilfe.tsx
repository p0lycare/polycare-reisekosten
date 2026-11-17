"use client";

import Link from "next/link";
import { useTexte } from "@/lib/i18n/client";

/** Kurze Erklärung unter der Seitenüberschrift: wozu die Seite da ist und was als Nächstes zu tun ist */
export function SeitenHilfe({ children, anker }: { children: React.ReactNode; anker?: string }) {
  const t = useTexte();
  return (
    <p className="text-sm text-neutral-600 dark:text-neutral-400">
      {children}{" "}
      <Link href={`/einfuehrung${anker ? `#${anker}` : ""}`} className="whitespace-nowrap underline">
        {t.rahmen.seitenHilfe.mehr}
      </Link>
    </p>
  );
}
