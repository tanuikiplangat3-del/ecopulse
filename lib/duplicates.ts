// One listing per domain, decided by an admin.
//
// When a domain that is already on the marketplace is submitted again - by a
// publisher adding it manually, by a bulk spreadsheet upload, or by approving a
// buyer-requested site - the new listing is NOT published and the existing one
// is NOT touched. The newcomer is parked as "conflict" and waits on Admin →
// Conflicts, where the two prices are shown side by side and an admin decides
// which one the marketplace keeps.
//
// IMPORTANT: losing listings are ARCHIVED, never deleted. Listing -> Order is a
// cascading relation, so deleting a listing would delete every order ever placed
// on it - payment history included. Archiving sets the status instead, which
// removes it from the marketplace (every buyer-facing query asks for "approved")
// while the order record survives.

import { prisma } from "@/lib/prisma";

/** Listing statuses used by duplicate handling. */
export const STATUS_CONFLICT = "conflict";   // held, waiting for an admin decision
export const STATUS_REPLACED = "replaced";   // taken down because a cheaper one won
export const STATUS_ARCHIVED = "archived";   // taken down by an admin, has order history

/** Statuses that mean a listing is live on the marketplace. */
export const LIVE_STATUS = "approved";

export type DuplicateCheck = {
  exists: boolean;
  cheapestCents: number | null; // lowest live price already listed for this domain
  count: number;
};

/** Is this domain already on the marketplace, and at what price? */
export async function checkDuplicate(domain: string): Promise<DuplicateCheck> {
  const live = await prisma.listing.findMany({
    where: { domain, status: LIVE_STATUS },
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
 * The live listing a newcomer would be competing with - the cheapest one, since
 * that is the price the marketplace is currently showing.
 */
export async function liveRivalFor(domain: string) {
  return prisma.listing.findFirst({
    where: { domain, status: LIVE_STATUS },
    orderBy: [{ priceCents: "asc" }, { createdAt: "asc" }],
    include: { publisher: { select: { id: true, name: true, email: true } } },
  });
}

/**
 * Which of these domains are already live? One query for a whole spreadsheet,
 * so a 1,000-row upload does not become 1,000 lookups.
 */
export async function liveDomains(domains: string[]): Promise<Set<string>> {
  if (domains.length === 0) return new Set();
  const rows = await prisma.listing.findMany({
    where: { domain: { in: domains }, status: LIVE_STATUS },
    select: { domain: true },
  });
  return new Set(rows.map((r) => r.domain));
}

/** Everything currently waiting on an admin decision, newest first. */
export async function pendingConflicts() {
  return prisma.listing.findMany({
    where: { status: STATUS_CONFLICT },
    orderBy: { createdAt: "desc" },
    include: { publisher: { select: { id: true, name: true, email: true } } },
  });
}

export async function countConflicts(): Promise<number> {
  return prisma.listing.count({ where: { status: STATUS_CONFLICT } });
}

/**
 * After a listing is published or repriced, make sure only the cheapest copy of
 * that domain stays live. Kept for the rare case where two listings end up live
 * at once; the normal path is now an admin decision, not this.
 */
export async function archiveDearerDuplicates(domain: string): Promise<number> {
  const live = await prisma.listing.findMany({
    where: { domain, status: LIVE_STATUS },
    select: { id: true, priceCents: true, createdAt: true },
    orderBy: [{ priceCents: "asc" }, { createdAt: "asc" }],
  });
  if (live.length < 2) return 0;

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
