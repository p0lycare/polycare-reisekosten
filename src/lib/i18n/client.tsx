"use client";

import { createContext, useContext } from "react";
import { STANDARD_SPRACHE, type Sprache } from "./sprache";
import { texte, type Texte } from "./woerterbuch";

const SpracheKontext = createContext<Sprache>(STANDARD_SPRACHE);

/** Stellt Client Components die Sprache bereit; gesetzt im Root-Layout */
export function SpracheProvider({ sprache, children }: { sprache: Sprache; children: React.ReactNode }) {
  return <SpracheKontext.Provider value={sprache}>{children}</SpracheKontext.Provider>;
}

export function useSprache(): Sprache {
  return useContext(SpracheKontext);
}

/** Wörterbuch für Client Components */
export function useTexte(): Texte {
  return texte(useContext(SpracheKontext));
}
