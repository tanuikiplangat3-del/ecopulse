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

/** What the buyer pays, given the publisher's price (both in cents). */
export function buyerPrice(publisherCents: number): number {
  return Math.round(publisherCents * (1 + commissionRate()));
}

export function trafficShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}
