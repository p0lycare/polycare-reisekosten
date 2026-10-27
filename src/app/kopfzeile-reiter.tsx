"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useBereich } from "./bereich";

export type Reiter = { href: string; text: string; aktivBei: string; zaehler?: number };

/** Bereichsreiter unter dem Logo; die aktive Seite ist grün unterstrichen, am Handy seitlich wischbar */
export function KopfzeileReiter({ reiter }: { reiter: Reiter[] }) {
  const pfad = usePathname();
  const bereich = useBereich();
  const aktiv = (r: Reiter) =>
    bereich ? r.aktivBei === bereich : r.aktivBei === "/" ? pfad === "/" || pfad.startsWith("/reisen") : pfad.startsWith(r.aktivBei);
  const leiste = useRef<HTMLElement>(null);

  // Am Handy passen nicht alle Reiter in die Zeile – den aktiven immer ins Bild holen
  useEffect(() => {
    leiste.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pfad, bereich]);

  return (
    <nav ref={leiste} aria-label="Bereiche" className="-mb-px flex gap-6 overflow-x-auto text-sm [scrollbar-width:none]">
      {reiter.map((r) => (
        <Link
          key={r.href}
          href={r.href}
          aria-current={aktiv(r) ? "page" : undefined}
          className={`flex shrink-0 items-center gap-1.5 border-b-2 py-3 whitespace-nowrap ${
            aktiv(r)
              ? "border-marke font-medium text-marke-dunkel dark:text-white"
              : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          }`}
        >
          {r.text}
          {!!r.zaehler && <span className="rounded-full bg-marke px-1.5 text-xs leading-5 font-medium text-white">{r.zaehler}</span>}
        </Link>
      ))}
    </nav>
  );
}
