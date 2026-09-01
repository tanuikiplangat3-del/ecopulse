// Keeping one listing per domain, at the lowest price.
//
// When a domain is listed more than once we keep the cheapest and take the
// dearer one off the marketplace.
//
// IMPORTANT: dearer listings are ARCHIVED, never deleted. Listing -> Order is a
// cascading relation, so deleting a listing would delete every order ever placed
// on it - payment history included. Archiving sets the status instead, which
// removes it from the marketplace (every buyer-facing query asks for "approved")
// while the order record survives.

import { prisma } from "@/lib/prisma";

/** Status used for a listing taken down because a cheaper duplicate exists. */
export const STATUS_REPLACED = "replaced";

/**
 * Status used when an admin clears out a publisher's sites but the listing has
 * orders on it. Same reasoning as above: the order record has to survive, so
 * the listing is taken off the marketplace rather than deleted.
 */
export const STATUS_ARCHIVED = "archived";

export type DuplicateCheck = {
  exists: boolean;
  cheapestCents: number | null; // lowest live price already listed for this domain
  count: number;
};

/** Is this domain already on the marketplace, and at what price? */
export async function checkDuplicate(domain: string): Promise<DuplicateCheck> {
  const live = await prisma.listing.findMany({
    where: { domain, status: "approved" },
    select: { id: true, priceCents: true },
    orderBy: { priceCents: "asc" },
  });
  return {
    exists: live.length > 0,
    cheapestCents: live.length ? live[0].priceCents : null,
    count: live.length,
  };
}

/**
 * After adding or repricing a listing, make sure only the cheapest copy of that
 * domain stays live. Returns how many dearer duplicates were archived.
 */
export async function archiveDearerDuplicates(domain: string): Promise<number> {
  const live = await prisma.listing.findMany({
    where: { domain, status: "approved" },
    select: { id: true, priceCents: true, createdAt: true },
    orderBy: [{ priceCents: "asc" }, { createdAt: "asc" }],
  });
  if (live.length < 2) return 0;

  // Keep the cheapest (oldest wins a tie); archive the rest.
  const keep = live[0].id;
  const drop = live.filter((l) => l.id !== keep).map((l) => l.id);
  if (drop.length === 0) return 0;

  const res = await prisma.listing.updateMany({
    where: { id: { in: drop } },
    data: { status: STATUS_REPLACED },
  });
  console.log(
    `[duplicates] ${domain}: kept listing ${keep} at ${live[0].priceCents} cents, archived ${res.count} dearer duplicate(s)`
  );
  return res.count;
}
