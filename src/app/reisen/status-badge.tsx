import { STATUS_TEXT, type ReiseStatus } from "@/lib/reisekosten/reise";

const FARBE: Record<ReiseStatus, string> = {
  entwurf: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  eingereicht: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  freigegeben: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  abgelehnt: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  ausgezahlt: "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
};

export function StatusBadge({ status }: { status: ReiseStatus }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${FARBE[status]}`}>{STATUS_TEXT[status]}</span>;
}
