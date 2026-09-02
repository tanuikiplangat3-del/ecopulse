// Who still gets the buyer-requested rate, and for how much longer.
//
// A buyer who brought us a publisher pays half the normal margin - but only for
// their first REQUESTER_ORDER_LIMIT orders on that listing. After that the site
// prices normally for them too.
//
// This is the ONLY place that decides it. Everywhere that shows or charges a
// price must get `requesterRate` from here rather than comparing requestedById
// itself, or the discount would never expire.

import { prisma } from "@/lib/prisma";
import { MARKUP_REQUESTED, REQUESTER_ORDER_LIMIT } from "@/lib/money";

export type RequesterListing = {
  id: number;
  markupModel?: string | null;
  requestedById?: number | null;
};

/** Cancelled orders never used up an allowance - nothing was ever paid. */
const COUNTS_TOWARDS_LIMIT = { not: "cancelled" };

/**
 * Of the listings given, which ones does this viewer still get their negotiated
 * rate on? One query for the whole page, so a marketplace grid stays cheap.
 */
export async function requesterRateListingIds(
  viewerId: number | null | undefined,
  listings: RequesterListing[]
): Promise<Set<number>> {
  const allowed = new Set<number>();
  if (!viewerId) return allowed;

  const mine = listings
    .filter((l) => l.markupModel === MARKUP_REQUESTED && l.requestedById === viewerId)
    .map((l) => l.id);
  if (mine.length === 0) return allowed;

  const orders = await prisma.order.findMany({
    where: { listingId: { in: mine }, buyerId: viewerId, status: COUNTS_TOWARDS_LIMIT },
    select: { listingId: true },
  });

  const used = new Map<number, number>();
  for (const o of orders) used.set(o.listingId, (used.get(o.listingId) || 0) + 1);

  for (const id of mine) {
    if ((used.get(id) || 0) < REQUESTER_ORDER_LIMIT) allowed.add(id);
  }
  return allowed;
}

/** Does this viewer get the reduced rate on this one listing right now? */
export async function hasRequesterRate(
  viewerId: number | null | undefined,
  listing: RequesterListing
): Promise<boolean> {
  const allowed = await requesterRateListingIds(viewerId, [listing]);
  return allowed.has(listing.id);
}

/**
 * How many reduced-rate orders this viewer has left on this listing, so the
 * buyer can see the allowance running down instead of being surprised by a
 * price change. Returns 0 for anyone who is not the requester.
 */
export async function requesterOrdersLeft(
  viewerId: number | null | undefined,
  listing: RequesterListing
): Promise<number> {
  if (!viewerId) return 0;
  if (listing.markupModel !== MARKUP_REQUESTED || listing.requestedById !== viewerId) return 0;
  const usedCount = await prisma.order.count({
    where: { listingId: listing.id, buyerId: viewerId, status: COUNTS_TOWARDS_LIMIT },
  });
  return Math.max(0, REQUESTER_ORDER_LIMIT - usedCount);
}
