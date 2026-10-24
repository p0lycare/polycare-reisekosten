import { STATUS_TEXT, type ReiseStatus } from "@/lib/reisekosten/reise";

const FARBE: Record<ReiseStatus, string> = {
  entwurf: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  eingereicht: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  freigegeben: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  geprueft: "bg-marke-hell text-marke-dunkel",
  abgelehnt: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  ausgezahlt: "bg-marke text-white",
};

export function StatusBadge({ status }: { status: ReiseStatus }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${FARBE[status]}`}>{STATUS_TEXT[status]}</span>;
}
