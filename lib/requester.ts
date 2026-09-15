// Who pays the rate they negotiated, on the sites they brought us.
//
// A buyer who brings us a publisher pays a flat commission on that publisher's
// sites instead of the tiered margin - see broughtInFee() in lib/money.ts. It
// applies to every order they place on those sites, for as long as they keep
// buying. There is no longer an allowance that runs out.
//
// This is still the ONLY place that decides it. Everywhere that shows or
// charges a price asks here rather than comparing requestedById itself, so the
// rule lives in exactly one file if it ever changes again.

import { MARKUP_INVITED, MARKUP_REQUESTED } from "@/lib/money";

/**
 * The two models that mean "this buyer brought us this publisher": a site we
 * listed from their request, and a site listed by a publisher who registered
 * through their link. Both price identically.
 */
const BROUGHT_IN_MODELS = [MARKUP_REQUESTED, MARKUP_INVITED];

export type RequesterListing = {
  id: number;
  markupModel?: string | null;
  requestedById?: number | null;
};

/** Did this viewer bring us the publisher behind this listing? */
function broughtInByViewer(viewerId: number | null | undefined, listing: RequesterListing): boolean {
  if (!viewerId) return false;
  return BROUGHT_IN_MODELS.includes(listing.markupModel || "") && listing.requestedById === viewerId;
}

/**
 * Of the listings given, which ones price at this viewer's negotiated rate?
 *
 * Async on purpose. It used to count orders to see whether an allowance had run
 * out; it no longer needs the database, but every caller awaits it and the
 * signature is kept so the rule can go back to needing a query without touching
 * the pages again.
 */
export async function requesterRateListingIds(
  viewerId: number | null | undefined,
  listings: RequesterListing[]
): Promise<Set<number>> {
  const allowed = new Set<number>();
  if (!viewerId) return allowed;
  for (const l of listings) {
    if (broughtInByViewer(viewerId, l)) allowed.add(l.id);
  }
  return allowed;
}

/** Does this viewer get their negotiated rate on this one listing? */
export async function hasRequesterRate(
  viewerId: number | null | undefined,
  listing: RequesterListing
): Promise<boolean> {
  return broughtInByViewer(viewerId, listing);
}
