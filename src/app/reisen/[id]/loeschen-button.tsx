"use client";

import { reiseLoeschen } from "../actions";

export function LoeschenButton({ id }: { id: string }) {
  return (
    <form
      action={reiseLoeschen}
      onSubmit={(e) => {
        if (!confirm("Diesen Entwurf wirklich löschen?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm text-red-700 underline dark:text-red-400">
        Entwurf löschen
      </button>
    </form>
  );
}
