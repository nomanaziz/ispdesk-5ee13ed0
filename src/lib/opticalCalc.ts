// Optical Link Power Calculator
// Splitter insertion losses (typical) + single-mode fiber distance loss

export type SplitterType =
  | "1:2" | "1:4" | "1:8" | "1:16" | "1:32" | "1:64"
  | "10:90" | "20:80" | "30:70" | "40:60" | "50:50";

// Insertion loss in dB for the larger output port
export const SPLITTER_LOSS: Record<SplitterType, { primary: number; secondary?: number; primaryLabel: string; secondaryLabel?: string }> = {
  "1:2": { primary: 3.6, primaryLabel: "1:2" },
  "1:4": { primary: 7.2, primaryLabel: "1:4" },
  "1:8": { primary: 10.5, primaryLabel: "1:8" },
  "1:16": { primary: 13.8, primaryLabel: "1:16" },
  "1:32": { primary: 17.1, primaryLabel: "1:32" },
  "1:64": { primary: 20.5, primaryLabel: "1:64" },
  "10:90": { primary: 10.5, secondary: 0.6, primaryLabel: "10", secondaryLabel: "90" },
  "20:80": { primary: 7.4, secondary: 1.1, primaryLabel: "20", secondaryLabel: "80" },
  "30:70": { primary: 5.7, secondary: 1.7, primaryLabel: "30", secondaryLabel: "70" },
  "40:60": { primary: 4.4, secondary: 2.4, primaryLabel: "40", secondaryLabel: "60" },
  "50:50": { primary: 3.4, secondary: 3.4, primaryLabel: "50", secondaryLabel: "50" },
};

export function splitterCalc(inputDbm: number, type: SplitterType) {
  const s = SPLITTER_LOSS[type];
  const results = [
    { label: s.primaryLabel, output: +(inputDbm - s.primary).toFixed(2) },
  ];
  if (s.secondary !== undefined) {
    results.push({ label: s.secondaryLabel!, output: +(inputDbm - s.secondary).toFixed(2) });
  }
  return results;
}

// Fiber loss: typical 0.35 dB/km at 1310nm, 0.25 dB/km at 1550nm
export function distanceCalc(inputDbm: number, distanceKm: number, lossPerKm = 0.35, connectorLoss = 0.5, spliceCount = 0, spliceLoss = 0.1) {
  const fiber = distanceKm * lossPerKm;
  const splice = spliceCount * spliceLoss;
  const total = fiber + connectorLoss + splice;
  return {
    fiberLoss: +fiber.toFixed(2),
    spliceLoss: +splice.toFixed(2),
    connectorLoss,
    totalLoss: +total.toFixed(2),
    output: +(inputDbm - total).toFixed(2),
  };
}

// RX power color classification
export function rxPowerStatus(rx: number | null | undefined): "good" | "warn" | "critical" | "unknown" {
  if (rx === null || rx === undefined || isNaN(rx as number)) return "unknown";
  if (rx >= -25) return "good";
  if (rx >= -27) return "warn";
  return "critical";
}
