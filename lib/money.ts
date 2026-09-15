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

/**
 * Founding buyers. The first FOUNDER_BUYER_LIMIT buyers to register see the
 * entire marketplace with no deposit at all, permanently. Once the slots are
 * gone they are gone - buyer number 11 onwards gets the ordinary $50 unlock.
 */
export const FOUNDER_BUYER_LIMIT = 10;

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
/**
 * A site listed by a publisher who joined through a buyer's link.
 *
 * This is DELIBERATELY not MARKUP_REQUESTED, even though both give one buyer a
 * reduced rate. "requested" means something else entirely across the codebase -
 * that the publisher has no account here - and it switches off the publisher's
 * delivery screens, the turnaround countdown and the auto-cancel sweep, and
 * hands the buyer a self-confirm form. These publishers are fully registered
 * and deliver like anybody else, so they get their own model.
 */
export const MARKUP_INVITED = "invited";

/* ---------------------------------------------------------------------------
 * Sites a buyer brought in
 *
 * A buyer who brings us a publisher they negotiated with pays a flat
 * commission on that publisher's sites instead of the tiered margin, and keeps
 * it for as long as they keep buying. Everyone else pays exactly the ordinary
 * tiered price, to the cent.
 *
 *   publisher price under $100    ->  $10
 *   $100 up to under $200         ->  $20
 *   $200 and above                ->  10%
 *
 * The two floors are what keeps a cheap site worth handling. Ten per cent of a
 * $30 site is $3.00 and a single payout costs more than that. They meet the
 * 10% exactly at $200 ($20 either way), so the buyer price never falls as the
 * publisher price rises.
 *
 *   $30 site   -> others $43.50, brought in by them $40.00
 *   $100 site  -> others $145.00, brought in by them $120.00
 *   $300 site  -> others $375.00, brought in by them $330.00
 *
 * Both models that mean "this buyer brought us this publisher" price the same
 * way: MARKUP_INVITED (the publisher registered through their link) and
 * MARKUP_REQUESTED (the publisher would not register, so we list it ourselves).
 * Every payout is manual, so the old split, where only "requested" carried a
 * floor because only it was paid by hand, no longer describes anything real.
 * ------------------------------------------------------------------------- */

/** Commission on a site the buyer brought in, once past the floors. */
export const BROUGHT_IN_RATE = 0.1;

/** Publisher price below which the first floor applies. */
export const BROUGHT_IN_BAND_1_CENTS = 10000; // $100
/** Publisher price below which the second floor applies. */
export const BROUGHT_IN_BAND_2_CENTS = 20000; // $200

/** Never earn less than this on a site under $100. */
export const BROUGHT_IN_FLOOR_1_CENTS = 1000; // $10
/** Never earn less than this on a site from $100 up to $200. */
export const BROUGHT_IN_FLOOR_2_CENTS = 2000; // $20

/**
 * What we charge the buyer who brought in this publisher, on top of the
 * publisher's price (VAT already included in `baseCents`, as everywhere else).
 */
export function broughtInFee(baseCents: number): number {
  if (baseCents < BROUGHT_IN_BAND_1_CENTS) return BROUGHT_IN_FLOOR_1_CENTS;
  if (baseCents < BROUGHT_IN_BAND_2_CENTS) return BROUGHT_IN_FLOOR_2_CENTS;
  return Math.round(baseCents * BROUGHT_IN_RATE);
}

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
 * Four rules are live at once:
 *   flat30    - sites listed before tiered pricing: publisher price + $30, for life
 *   tiered    - everything listed since: +45% / +25% by band
 *   requested - a site a buyer negotiated themselves, listed by us on the
 *               container account because the publisher would not register
 *   invited   - a site listed by a publisher who registered through that
 *               buyer's link
 *
 * On the last two, the buyer who brought the publisher in pays the flat
 * commission above. Everyone else pays exactly the ordinary tiered price.
 *
 * `requesterRate` means "this viewer is the buyer who brought this publisher
 * in". lib/requester.ts is the only correct source for it.
 */
export function buyerPrice(
  publisherCents: number,
  markupModel?: string | null,
  opts?: { vatPercent?: number | null; requesterRate?: boolean }
): number {
  const base = listingBaseCents(publisherCents, opts?.vatPercent);

  if (markupModel === MARKUP_REQUESTED || markupModel === MARKUP_INVITED) {
    const standardFee = Math.round(base * markupRate(base));
    // The buyer who brought this publisher in pays the flat commission. Capped
    // at the ordinary margin, because below about $22 the $10 floor is actually
    // MORE than the tiered margin - and the one rule that must never break is
    // that bringing us a publisher can never cost you more than not bothering.
    if (opts?.requesterRate) return base + Math.min(broughtInFee(base), standardFee);
    // Everyone else pays the ordinary tiered price, to the cent, with no floor.
    // A site someone brought us must never be dearer for an ordinary buyer than
    // the same site listed the normal way.
    return base + standardFee;
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
