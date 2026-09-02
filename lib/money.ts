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
 * Service fee charged on every wallet deposit (5%), covering card processing.
 * Stripe's own cut is roughly 2.9% + $0.30 per payment, so this covers it with a
 * little margin on larger deposits.
 */
export const SERVICE_FEE_RATE = 0.05;
export function depositFee(grossCents: number): number {
  return Math.round(grossCents * SERVICE_FEE_RATE);
}
/** What lands in the wallet after the 5% service fee. */
export function netDeposit(grossCents: number): number {
  return grossCents - depositFee(grossCents);
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
export const MARKUP_REQUESTED = "requested";

/* ---------------------------------------------------------------------------
 * Buyer-requested sites
 *
 * A buyer who brings us a publisher we do not carry gets a discount, not a way
 * round the marketplace. They pay HALF the margin everyone else pays, so the
 * reward scales with the band and always leaves a real operating margin:
 *
 *   $100 site  -> others $145.00, requester $122.50
 *   $300 site  -> others $375.00, requester $337.50
 *
 * The discount runs out after REQUESTER_ORDER_LIMIT orders on that listing;
 * after that they pay the standard rate like anyone else.
 *
 * MIN_PLATFORM_FEE_CENTS applies to requested sites only. Their publishers have
 * no account here, so every payout is a manual PayPal or bank transfer - on a
 * cheap site the transfer fee alone can exceed the margin.
 * ------------------------------------------------------------------------- */

/** The requester pays this share of the normal margin. */
export const REQUESTER_MARGIN_SHARE = 0.5;

/** Never earn less than this on a requested site, whoever is buying. */
export const MIN_PLATFORM_FEE_CENTS = 2500; // $25

/** How many orders one requester gets at their reduced rate, per listing. */
export const REQUESTER_ORDER_LIMIT = 3;

/**
 * The publisher's price with VAT added. VAT is charged on top and passed
 * through to the publisher, so it forms the base that any margin sits on.
 * Ordinary listings carry no VAT, so this returns the price untouched.
 */
export function listingBaseCents(publisherCents: number, vatPercent?: number | null): number {
  const vat = vatPercent || 0;
  if (vat <= 0) return publisherCents;
  return Math.round(publisherCents * (1 + vat / 100));
}

/**
 * What a buyer pays for a listing, in cents.
 *
 * Three rules are live at once:
 *   flat30    - sites listed before tiered pricing: publisher price + $30, for life
 *   tiered    - everything listed since: +45% / +25% by band
 *   requested - a site a buyer negotiated themselves. That buyer pays half the
 *               normal margin for their first few orders; everyone else, and
 *               that buyer afterwards, pays the standard margin.
 *
 * `requesterRate` is NOT simply "is this the requester". The caller must have
 * already checked that they are the requester AND still have orders left at the
 * reduced rate - see lib/requester.ts, which is the only correct source for it.
 */
export function buyerPrice(
  publisherCents: number,
  markupModel?: string | null,
  opts?: { vatPercent?: number | null; requesterRate?: boolean }
): number {
  const base = listingBaseCents(publisherCents, opts?.vatPercent);

  if (markupModel === MARKUP_REQUESTED) {
    const standardFee = Math.round(base * markupRate(base));
    const fee = opts?.requesterRate ? Math.round(standardFee * REQUESTER_MARGIN_SHARE) : standardFee;
    // The floor covers the manual payout these sites always need.
    return base + Math.max(fee, MIN_PLATFORM_FEE_CENTS);
  }
  if (markupModel === MARKUP_TIERED) {
    return Math.round(base * (1 + markupRate(base)));
  }
  return base + LEGACY_MARKUP_CENTS;
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
