"use client";

import { createContext, useContext, useEffect, useState } from "react";

type BereichKontext = { bereich: string | null; setBereich: (b: string | null) => void };

const Kontext = createContext<BereichKontext>({ bereich: null, setBereich: () => {} });

/**
 * Manche Seiten gehören fachlich zu einem anderen Reiter als ihr Pfad – z. B. liegt eine
 * Auslagenabrechnung unter /reisen/[id], gehört aber zu „Meine Auslagen“.
 */
export function BereichProvider({ children }: { children: React.ReactNode }) {
  // Zurückgesetzt wird beim Verlassen der Seite durch das Aufräumen in <Bereich>
  const [bereich, setBereich] = useState<string | null>(null);
  return <Kontext.Provider value={{ bereich, setBereich }}>{children}</Kontext.Provider>;
}

/** Markiert die aktuelle Seite als Teil des Reiters mit diesem Pfad */
export function Bereich({ reiter }: { reiter: string }) {
  const { setBereich } = useContext(Kontext);
  useEffect(() => {
    setBereich(reiter);
    return () => setBereich(null);
  }, [reiter, setBereich]);
  return null;
}

export function useBereich(): string | null {
  return useContext(Kontext).bereich;
}
