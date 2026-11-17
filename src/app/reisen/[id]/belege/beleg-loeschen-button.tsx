"use client";

import { useTexte } from "@/lib/i18n/client";
import { belegLoeschen } from "./actions";

export function BelegLoeschenButton({ id, reiseId }: { id: string; reiseId: string }) {
  const t = useTexte().belege.loeschen;
  return (
    <form
      action={belegLoeschen}
      onSubmit={(e) => {
        if (!confirm(t.frage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="reise_id" value={reiseId} />
      <button type="submit" className="text-sm text-red-700 underline dark:text-red-400">
        {t.knopf}
      </button>
    </form>
  );
}
