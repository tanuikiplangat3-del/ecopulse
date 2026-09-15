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

/**
 * The one canonical form of a domain: lower case, no protocol, no "www.", no
 * path, no trailing dot.
 *
 * Every write and every comparison goes through this. Without it the duplicate
 * guard is trivially bypassed - "Example.com" and "www.example.com" both slip
 * past a check for "example.com", which publishes a second copy of a site we
 * already carry AND, for a publisher invited by a buyer, hands that buyer a
 * second reduced-rate listing on each spelling.
 */
export function normalizeDomain(input: string): string {
  const cleaned = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    // Everything from the first path, query, fragment, credential or whitespace
    // character onwards. Cutting only on "/" left "example.com?ref=x" as a
    // separate key from "example.com", which reopened the whole bypass.
    .replace(/[/?#\s].*$/, "")
    .replace(/^[^@]*@/, "")
    .replace(/:\d+$/, "")
    .replace(/\.+$/, "");

  // Must still look like a hostname. "https://" on its own normalises to the
  // empty string, and an empty or malformed domain must never reach the
  // database as a listing.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(cleaned)) return "";
  return cleaned;
}

/**
 * A `where` fragment matching every live listing for this domain, however it
 * happens to be spelled in the database.
 *
 * Rows created before normalisation may be stored as "Example.com" or
 * "www.example.com". Every read that asks "what is already live on this
 * domain?" must use this, not `{ domain }` - otherwise the duplicate guard
 * parks a newcomer as a conflict and the conflict screen, finding no rival,
 * happily publishes it alongside the row it was meant to compete with.
 */
export function liveMatching(domain: string, isDemo = false) {
  const canonical = normalizeDomain(domain) || String(domain || "").trim().toLowerCase();
  return {
    status: LIVE_STATUS,
    // Demo inventory and real inventory are separate marketplaces, so a demo
    // site must never be treated as a duplicate of a real one or vice versa.
    isDemo,
    OR: [
      { domain: { equals: canonical, mode: "insensitive" as const } },
      { domain: { equals: `www.${canonical}`, mode: "insensitive" as const } },
    ],
  };
}

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

/**
 * Is this domain already on the marketplace, and at what price?
 *
 * Matched case-insensitively, because rows created before normalisation may be
 * stored as "Example.com" or "www.example.com".
 */
export async function checkDuplicate(domain: string, isDemo = false): Promise<DuplicateCheck> {
  const live = await prisma.listing.findMany({
    where: liveMatching(domain, isDemo),
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
export async function liveRivalFor(domain: string, isDemo = false) {
  return prisma.listing.findFirst({
    where: liveMatching(domain, isDemo),
    orderBy: [{ priceCents: "asc" }, { createdAt: "asc" }],
    include: { publisher: { select: { id: true, name: true, email: true } } },
  });
}

/**
 * Which of these domains are already live? One query for a whole spreadsheet,
 * so a 1,000-row upload does not become 1,000 lookups.
 */
export async function liveDomains(domains: string[], isDemo = false): Promise<Set<string>> {
  if (domains.length === 0) return new Set();
  const wanted = new Set(domains.map(normalizeDomain));
  // Every live domain, then compared in canonical form here. An `in` query
  // would be case-sensitive and blind to a "www." prefix, which is exactly the
  // bypass this guard exists to stop. It is one column on a few hundred rows.
  const rows = await prisma.listing.findMany({
    where: { status: LIVE_STATUS, isDemo },
    select: { domain: true },
  });
  const live = new Set<string>();
  for (const r of rows) {
    const canonical = normalizeDomain(r.domain);
    if (wanted.has(canonical)) live.add(canonical);
  }
  return live;
}

/**
 * Is this domain on the platform at all, whatever state it is in?
 *
 * Wider than liveMatching() on purpose. A site sitting in review or held on a
 * conflict is still a publisher we already have, so a buyer must not be sent
 * off to invite them a second time and be promised a rate we would then have
 * to take back.
 */
export async function domainOnPlatform(domain: string, isDemo = false): Promise<boolean> {
  const canonical = normalizeDomain(domain);
  if (!canonical) return false;
  const count = await prisma.listing.count({
    where: {
      isDemo,
      status: { in: [LIVE_STATUS, "pending", STATUS_CONFLICT] },
      OR: [
        { domain: { equals: canonical, mode: "insensitive" } },
        { domain: { equals: `www.${canonical}`, mode: "insensitive" } },
      ],
    },
  });
  return count > 0;
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
export async function archiveDearerDuplicates(domain: string, isDemo = false): Promise<number> {
  const live = await prisma.listing.findMany({
    where: liveMatching(domain, isDemo),
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
