"use client";

import { useState, useTransition } from "react";
import { testmailSenden, type TestmailStatus } from "./actions";

export function TestmailKnopf() {
  const [status, setStatus] = useState<TestmailStatus>({});
  const [laeuft, starten] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={laeuft}
        onClick={() => starten(async () => setStatus(await testmailSenden()))}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {laeuft ? "Sendet …" : "Testmail an mich senden"}
      </button>
      {status.gesendetAn && <span role="status" className="text-sm text-green-700 dark:text-green-400">Gesendet an {status.gesendetAn}</span>}
      {status.fehler && <span role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</span>}
    </div>
  );
}
