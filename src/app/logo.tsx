/** Polycare-Bildzeichen (Dach und Balken, wie auf polycare.de); Farbe folgt dem Text */
export function Logo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 169" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M.08 134.23h159.1v34.02H.08zM0 49.24v38.58l79.68-48.51 79.67 48.5V49.24L79.67 0z" />
    </svg>
  );
}
