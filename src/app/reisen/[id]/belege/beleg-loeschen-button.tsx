"use client";

import { belegLoeschen } from "./actions";

export function BelegLoeschenButton({ id, reiseId }: { id: string; reiseId: string }) {
  return (
    <form
      action={belegLoeschen}
      onSubmit={(e) => {
        if (!confirm("Diesen Beleg wirklich löschen?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="reise_id" value={reiseId} />
      <button type="submit" className="text-sm text-red-700 underline dark:text-red-400">
        Beleg löschen
      </button>
    </form>
  );
}
