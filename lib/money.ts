// All money is integer USD cents.

export function money(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

export function centsFromUsd(usd: number): number {
  return Math.round(usd * 100);
}

export function commissionRate(): number {
  const r = parseFloat(process.env.PLATFORM_COMMISSION || "0");
  return isNaN(r) ? 0 : r;
}

/** Flat platform markup added on top of every publisher price (USD cents). */
export const STANDARD_MARKUP_CENTS = 3000; // $30

/** Standard service fee charged on every deposit (5%). */
export const SERVICE_FEE_RATE = 0.05;
export function depositFee(grossCents: number): number {
  return Math.round(grossCents * SERVICE_FEE_RATE);
}
/** What actually lands in the wallet after the 5% service fee. */
export function netDeposit(grossCents: number): number {
  return grossCents - depositFee(grossCents);
}

/**
 * What the buyer pays: the publisher's price plus our standard $30 markup.
 * The publisher still receives exactly their own price; admins see the real
 * publisher price, buyers see this marked-up total.
 */
export function buyerPrice(publisherCents: number): number {
  return publisherCents + STANDARD_MARKUP_CENTS;
}

export function trafficShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}
