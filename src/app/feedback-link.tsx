"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Feedback-Link, der die aktuelle Seite mitgibt */
export function FeedbackLink() {
  const pfad = usePathname();
  return (
    <Link
      href={pfad && pfad !== "/melden" ? `/melden?von=${encodeURIComponent(pfad)}` : "/melden"}
      className="text-neutral-500 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
    >
      Feedback
    </Link>
  );
}
