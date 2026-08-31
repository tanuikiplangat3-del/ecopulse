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

/**
 * No deposit fee. Buyers are credited every cent they pay in - VAT and service
 * costs are already built into the price shown on each listing, so charging
 * again at deposit time would be charging twice.
 */
export const SERVICE_FEE_RATE = 0;
export function depositFee(_grossCents: number): number {
  return 0;
}
/** The whole deposit lands in the wallet. */
export function netDeposit(grossCents: number): number {
  return grossCents;
}

/**
 * Minimum total deposited before a buyer sees the whole marketplace.
 * Measured on gross deposits (what the buyer paid), not the net credited.
 */
export const UNLOCK_DEPOSIT_CENTS = 5000; // $50

/** Smallest wallet top-up allowed. Matches the amount that unlocks the marketplace. */
export const MIN_TOPUP_CENTS = UNLOCK_DEPOSIT_CENTS;

/** Free listings every visitor can see before the paywall applies. */
export const FREE_PREVIEW_COUNT = 10;

/* ---------------------------------------------------------------------------
 * Buyer pricing: a markup on the publisher's price that varies by price band.
 *
 *   up to $200        -> +45%
 *   $200 to $300      -> slides evenly from +45% down to +25%
 *   $300 and above    -> +25%
 *
 * The sliding middle exists on purpose. With a hard cut at one price, a site
 * costing slightly more would sell for less than a cheaper one sitting next to
 * it in the marketplace (a $250 site at +45% is $362.50; a $251 site at +25%
 * is $313.75). Sliding the rate keeps the buyer price rising the whole way.
 *
 * The publisher always receives exactly their own price. Admins see the real
 * publisher price; buyers see the marked-up total.
 * ------------------------------------------------------------------------- */

const LOW_BAND_CENTS = 20000; // $200 - everything at or below this gets +45%
const HIGH_BAND_CENTS = 30000; // $300 - everything at or above this gets +25%
const LOW_RATE = 0.45;
const HIGH_RATE = 0.25;

/** The markup rate applied to a given publisher price. */
export function markupRate(publisherCents: number): number {
  if (publisherCents <= LOW_BAND_CENTS) return LOW_RATE;
  if (publisherCents >= HIGH_BAND_CENTS) return HIGH_RATE;
  const progress = (publisherCents - LOW_BAND_CENTS) / (HIGH_BAND_CENTS - LOW_BAND_CENTS);
  return LOW_RATE - (LOW_RATE - HIGH_RATE) * progress;
}

/** The flat markup used by sites listed before tiered pricing launched. */
export const LEGACY_MARKUP_CENTS = 3000; // $30

/** The pricing rule a listing was created under. */
export const MARKUP_TIERED = "tiered";
export const MARKUP_FLAT30 = "flat30";

/**
 * What the buyer pays for a listing, in cents.
 *
 * Sites listed before tiered pricing launched keep the old flat $30 markup for
 * life, so nobody's existing listing changes price underneath them. Only sites
 * added from now on use the tiered rates.
 */
export function buyerPrice(publisherCents: number, markupModel?: string | null): number {
  if (markupModel !== MARKUP_TIERED) return publisherCents + LEGACY_MARKUP_CENTS;
  return Math.round(publisherCents * (1 + markupRate(publisherCents)));
}

/**
 * The inverse of the tiered curve: given a price a buyer typed into a filter,
 * find the publisher price that produces it. The curve is piecewise (and
 * quadratic across the sliding band), so this solves it by binary search rather
 * than algebra - it always increases, which is what makes that safe.
 */
export function publisherPriceFromBuyer(buyerCents: number): number {
  if (buyerCents <= 0) return 0;
  let low = 0;
  let high = Math.max(buyerCents, 1);
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (buyerPrice(mid, MARKUP_TIERED) < buyerCents) low = mid;
    else high = mid;
  }
  return Math.round(high);
}

/**
 * Filter bounds covering BOTH pricing rules. Two models are live at once, so a
 * single publisher-price bound cannot be exact for both; these take the wider of
 * the two so a matching site is never hidden from a filtered search.
 */
export function filterFloorFromBuyer(buyerCents: number): number {
  return Math.min(publisherPriceFromBuyer(buyerCents), Math.max(0, buyerCents - LEGACY_MARKUP_CENTS));
}
export function filterCeilingFromBuyer(buyerCents: number): number {
  return Math.max(publisherPriceFromBuyer(buyerCents), Math.max(0, buyerCents - LEGACY_MARKUP_CENTS));
}

export function trafficShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}
