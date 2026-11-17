/**
 * Form eines Wörterbuchs, abgeleitet vom deutschen: gleiche Schlüssel, Texte als string,
 * Funktionen mit gleichen Parametern. Fehlt ein englischer Schlüssel (oder ist einer zu viel),
 * meldet das der Typecheck.
 */
export type Uebersetzung<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends (...args: infer A) => infer R
      ? (...args: A) => R extends string ? string : R
      : T[K] extends readonly string[]
        ? string[]
        : Uebersetzung<T[K]>;
};
