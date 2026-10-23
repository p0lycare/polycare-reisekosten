import { startTransition, type FormEvent } from "react";

/**
 * Sendet ein Formular an eine Server Action, ohne dass React die Felder danach zurücksetzt.
 * Mit <form action={…}> wären bei einer Fehlermeldung alle Eingaben verloren.
 */
export function ohneZuruecksetzen(aktion: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => aktion(formData));
  };
}
