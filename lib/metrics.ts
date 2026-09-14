// Shared Domain Rating refresh, used by both the admin button and the weekly
// background scheduler. Everything Ahrefs-related lives in lib/ahrefs.ts; this
// file only decides which listings are due and writes the results back.
//
// Monthly traffic is NOT touched here. It is a publisher-entered number now, so
// a refresh must never overwrite it.

import { prisma } from "@/lib/prisma";
import { fetchDomainRating } from "@/lib/ahrefs";
import { authorityScoreFor } from "@/lib/authority";

/** How old a listing's DR may get before it is refreshed again. */
export const REFRESH_AFTER_DAYS = 7;

export type RefreshResult = {
  updated: number;
  failed: number;
  processed: number;
  remaining: number;
};

/**
 * Refresh listings whose metrics have never been fetched, or were last fetched
 * more than REFRESH_AFTER_DAYS ago. Oldest first, so nothing is starved.
 *
 * Stops at whichever comes first: `maxItems` processed, or `budgetMs` elapsed.
 * Callers on a web request pass a short budget; the background job passes a long one.
 */
export async function refreshDueMetrics(opts: {
  maxItems?: number;
  budgetMs?: number;
  parallel?: number;
} = {}): Promise<RefreshResult> {
  const maxItems = opts.maxItems ?? 500;
  const budgetMs = opts.budgetMs ?? 25_000;
  const parallel = opts.parallel ?? 10;
  const deadline = Date.now() + budgetMs;

  const cutoff = new Date(Date.now() - REFRESH_AFTER_DAYS * 86400_000);
  // Demo sites are invented domains. Asking Ahrefs about them burns API units
  // and would overwrite their hand-set DR with 0, which is the one number the
  // demo needs to look right.
  const where = {
    isDemo: false,
    OR: [{ metricsUpdatedAt: null }, { metricsUpdatedAt: { lt: cutoff } }],
  };

  // Two plain queries rather than one "nulls first" ordering: never-fetched
  // listings come first, then the longest-stale ones. Nothing gets starved and
  // there is no reliance on database-specific null ordering.
  let due = await prisma.listing.findMany({
    where: { isDemo: false, metricsUpdatedAt: null },
    orderBy: { id: "asc" },
    take: maxItems,
  });
  if (due.length < maxItems) {
    const oldest = await prisma.listing.findMany({
      where: { isDemo: false, metricsUpdatedAt: { lt: cutoff } },
      orderBy: { metricsUpdatedAt: "asc" },
      take: maxItems - due.length,
    });
    due = due.concat(oldest);
  }

  let updated = 0;
  let failed = 0;
  let processed = 0;

  for (let i = 0; i < due.length; i += parallel) {
    if (Date.now() > deadline) break;
    const chunk = due.slice(i, i + parallel);
    const results = await Promise.all(chunk.map((l) => fetchDomainRating(l.domain)));
    for (let j = 0; j < chunk.length; j++) {
      processed++;
      const { dr, ok } = results[j];
      // Ahrefs did not answer. Keep the existing DR, but push this listing back
      // a day so one unreachable domain cannot block the queue forever.
      if (!ok) {
        failed++;
        await prisma.listing.update({
          where: { id: chunk[j].id },
          data: { metricsUpdatedAt: new Date(Date.now() - (REFRESH_AFTER_DAYS - 1) * 86400_000) },
        });
        continue;
      }
      // Refresh the real Ahrefs DR for every site, including ones that display
      // a publisher-supplied DA - admins need the true number to sanity-check
      // the claim. authorityScore then follows whichever number is on display:
      // it moves with DR on a DR site and stays put on a DA site.
      // monthlyTraffic is deliberately absent from this update: the publisher
      // owns that number now.
      await prisma.listing.update({
        where: { id: chunk[j].id },
        data: {
          domainRating: dr,
          metricsUpdatedAt: new Date(),
          authorityScore: authorityScoreFor({ ...chunk[j], domainRating: dr }),
        },
      });
      updated++;
    }
  }

  const remaining = await prisma.listing.count({ where });
  return { updated, failed, processed, remaining };
}
