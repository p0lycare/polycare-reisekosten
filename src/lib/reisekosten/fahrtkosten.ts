/**
 * Pauschale Kilometersätze für Fahrten mit privatem Fahrzeug in Cent je km
 * (§ 9 Abs. 1 Satz 3 Nr. 4a EStG i. V. m. BRKG).
 */
export const KM_SAETZE = {
  pkw: 30,
  motorrad: 20,
} as const;

export type Fahrzeug = keyof typeof KM_SAETZE;

export function berechneFahrtkosten(km: number, fahrzeug: Fahrzeug = "pkw"): number {
  if (!Number.isFinite(km) || km < 0) throw new Error("Kilometer müssen eine positive Zahl sein");
  return Math.round(km * KM_SAETZE[fahrzeug]);
}
