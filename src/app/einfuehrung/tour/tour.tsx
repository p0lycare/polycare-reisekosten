"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type TourAnsicht = { id: string; titel: string; text: ReactNode; bild: ReactNode; link?: { href: string; text: string } };

/** Click-through-Tour: ein Schritt je Seite, Weiter/Zurück per Knopf, Pfeiltasten oder Punkt-Navigation */
export function Tour({ schritte }: { schritte: TourAnsicht[] }) {
  const [nr, setNr] = useState(0);
  const titel = useRef<HTMLHeadingElement>(null);
  const schritt = schritte[nr];
  const letzter = nr === schritte.length - 1;

  useEffect(() => {
    function taste(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") setNr((n) => Math.min(n + 1, schritte.length - 1));
      if (e.key === "ArrowLeft") setNr((n) => Math.max(n - 1, 0));
    }
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [schritte.length]);

  // Fokus auf die neue Überschrift, damit Screenreader den Schrittwechsel ansagen
  useEffect(() => titel.current?.focus(), [nr]);

  return (
    <section aria-roledescription="Tour" className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 text-sm text-neutral-500">
        <span>
          Schritt {nr + 1} von {schritte.length}
        </span>
        <Link href="/einfuehrung" className="underline">
          Tour beenden
        </Link>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden>
        <div className="h-full bg-marke transition-all" style={{ width: `${((nr + 1) / schritte.length) * 100}%` }} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
        <div className="flex flex-col gap-3">
          <h2 ref={titel} tabIndex={-1} className="text-xl font-semibold outline-none">
            {schritt.titel}
          </h2>
          <div className="flex flex-col gap-2 text-sm text-neutral-700 dark:text-neutral-300">{schritt.text}</div>
          {schritt.link && (
            <Link href={schritt.link.href} className="text-sm font-medium text-marke-dunkel underline dark:text-marke">
              {schritt.link.text} →
            </Link>
          )}
        </div>
        <div aria-hidden className="pointer-events-none select-none">
          {schritt.bild}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setNr((n) => n - 1)}
          disabled={nr === 0}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:invisible dark:border-neutral-700"
        >
          Zurück
        </button>
        <nav aria-label="Schritte" className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
          {schritte.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setNr(i)}
              aria-label={`Schritt ${i + 1}: ${s.titel}`}
              aria-current={i === nr ? "step" : undefined}
              className={`size-2 rounded-full sm:size-2.5 ${i === nr ? "bg-marke" : "bg-neutral-300 dark:bg-neutral-700"}`}
            />
          ))}
        </nav>
        {letzter ? (
          <Link href={schritt.link?.href ?? "/"} className="rounded-md bg-primaer px-4 py-2 text-sm font-medium text-white hover:bg-primaer-hover dark:text-neutral-950">
            Los geht&apos;s
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setNr((n) => n + 1)}
            className="rounded-md bg-primaer px-4 py-2 text-sm font-medium text-white hover:bg-primaer-hover dark:text-neutral-950"
          >
            Weiter
          </button>
        )}
      </div>
    </section>
  );
}
