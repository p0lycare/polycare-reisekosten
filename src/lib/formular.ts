import { startTransition, type FormEvent } from "react";

/**
 * Sendet ein Formular an eine Server Action, ohne dass React die Felder danach zurücksetzt.
 * Mit <form action={…}> wären bei einer Fehlermeldung alle Eingaben verloren.
 */
export function ohneZuruecksetzen(aktion: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Den auslösenden Knopf mitschicken (name/value), wie es das Formular ohne JavaScript auch täte
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter instanceof HTMLElement ? submitter : null);
    startTransition(() => aktion(formData));
  };
}
