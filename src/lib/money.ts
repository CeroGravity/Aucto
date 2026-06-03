// Money is always integer minor units (poisha; 1/100 Taka). No floats anywhere.

const TAKA = "৳";

const grouper = new Intl.NumberFormat("en-US");

/**
 * Format a price in poisha to a `৳` string.
 * - 250000 → "৳2,500"
 * - 250050 → "৳2,500.50"
 */
export function formatPriceMinor(priceMinor: number): string {
  const negative = priceMinor < 0;
  const abs = Math.abs(Math.trunc(priceMinor));
  const taka = Math.floor(abs / 100);
  const poisha = abs % 100;
  const body =
    poisha === 0
      ? grouper.format(taka)
      : `${grouper.format(taka)}.${poisha.toString().padStart(2, "0")}`;
  return `${negative ? "-" : ""}${TAKA}${body}`;
}

/**
 * Parse a Taka amount (admin input, e.g. "2500" or "2500.50") to integer
 * poisha. Returns null for invalid/negative input. Avoids float drift by
 * parsing the fractional part as two digits of poisha directly.
 * - "2500" → 250000
 * - "2500.5" → 250050
 * - "2500.50" → 250050
 */
export function parseTakaToMinor(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!match) return null;
  const taka = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(2, "0");
  const poisha = Number(frac);
  if (!Number.isSafeInteger(taka)) return null;
  return taka * 100 + poisha;
}

/** Integer poisha → plain Taka string for editing (no symbol/grouping). */
export function minorToTakaInput(priceMinor: number): string {
  const taka = Math.floor(priceMinor / 100);
  const poisha = priceMinor % 100;
  return poisha === 0 ? String(taka) : `${taka}.${poisha.toString().padStart(2, "0")}`;
}
