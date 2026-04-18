// VAT calculator helper
// mode: 'including' = price already contains VAT (extract base + vat from price)
//       'excluding' = price is base, VAT to be added on top

export type VatMode = "including" | "excluding";

export interface VatBreakdown {
  base: number;
  vat: number;
  total: number;
}

export function calcVat(price: number, percent: number, mode: VatMode = "including"): VatBreakdown {
  const p = Number(price) || 0;
  const v = Number(percent) || 0;
  if (v <= 0) return { base: p, vat: 0, total: p };

  if (mode === "including") {
    const base = +(p / (1 + v / 100)).toFixed(2);
    const vat = +(p - base).toFixed(2);
    return { base, vat, total: p };
  }
  // excluding
  const vat = +((p * v) / 100).toFixed(2);
  const total = +(p + vat).toFixed(2);
  return { base: p, vat, total };
}

export function formatBdt(n: number): string {
  return `৳${(Math.round(n * 100) / 100).toLocaleString("en-BD")}`;
}
