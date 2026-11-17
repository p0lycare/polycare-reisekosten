"use client";

import { useTexte } from "@/lib/i18n/client";
import { reiseLoeschen } from "../actions";

export function LoeschenButton({ id }: { id: string }) {
  const t = useTexte().reisen.loeschen;
  return (
    <form
      action={reiseLoeschen}
      onSubmit={(e) => {
        if (!confirm(t.frage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm text-red-700 underline dark:text-red-400">
        {t.knopf}
      </button>
    </form>
  );
}
