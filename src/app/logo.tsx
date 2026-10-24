/**
 * Polycare-Wortmarke (Dach und Schriftzug, aus der Präsentationsvorlage).
 * Die PNG dient als Maske, die Farbe folgt dem Text (currentColor) – so passt sie auch im Dark Mode.
 */
export function Logo({ className = "h-6" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Polycare"
      className={`inline-block aspect-[509/96] bg-current ${className}`}
      style={{
        maskImage: "url(/polycare-wortmarke.png)",
        WebkitMaskImage: "url(/polycare-wortmarke.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
}
