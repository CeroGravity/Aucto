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
