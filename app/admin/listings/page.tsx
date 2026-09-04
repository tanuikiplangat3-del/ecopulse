import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money, trafficShort } from "@/lib/money";
import { StatusBadge, Flash } from "@/components/ui";
import { approveListingAction, rejectListingAction, approveAllListingsAction, refreshListingMetricsAction, normalizeListingCountriesAction } from "@/app/actions/admin";
import { REFRESH_AFTER_DAYS } from "@/lib/metrics";
import { normalizeCountry } from "@/lib/data";
import { countConflicts } from "@/lib/duplicates";
import Link from "next/link";
import { authorityFor, isClaimedAuthority } from "@/lib/authority";

export default async function AdminListings({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  await requireRole("admin");
  const listings = await prisma.listing.findMany({ include: { publisher: true }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  const conflictCount = await countConflicts();
  const pendingCount = listings.filter((l) => l.status === "pending").length;
  // Metrics refresh themselves every REFRESH_AFTER_DAYS days; this counts what is due now.
  const cutoff = new Date(Date.now() - REFRESH_AFTER_DAYS * 86400_000);
  const staleCount = listings.filter(
    (l) => !l.metricsUpdatedAt || l.metricsUpdatedAt < cutoff
  ).length;

  // Sites whose country does not match one of the names the marketplace filter
  // uses - usually a spreadsheet spelling like "dr congo". They are listed but
  // invisible to anyone browsing by country, so offer a one-press fix.
  const oddCountry = listings.filter((l) => {
    const canonical = normalizeCountry(l.country);
    return !canonical || canonical !== l.country;
  }).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="h2">Listings</h1>
        <div className="flex flex-wrap justify-end gap-2">
          {oddCountry > 0 && (
            <form action={normalizeListingCountriesAction}>
              <button className="btn-ghost btn-sm" type="submit">Fix country names ({oddCountry})</button>
            </form>
          )}
          {staleCount > 0 && (
            <form action={refreshListingMetricsAction}>
              <button className="btn-ghost btn-sm" type="submit">Refresh DR &amp; traffic ({staleCount} due)</button>
            </form>
          )}
          {pendingCount > 0 && (
            <form action={approveAllListingsAction}>
              <button className="btn-accent btn-sm" type="submit">Approve all pending ({pendingCount})</button>
            </form>
          )}
        </div>
      </div>
      <Flash searchParams={searchParams} />

      {conflictCount > 0 && (
        <Link
          href="/admin/conflicts"
          className="card mb-5 flex items-center justify-between border-wt-yellow/40 hover:border-wt-yellow"
        >
          <div>
            <p className="font-semibold text-wt-yellow">
              {conflictCount} website{conflictCount === 1 ? "" : "s"} waiting on a price decision
            </p>
            <p className="muted text-sm">
              Domains we already list were submitted again. Compare the prices and choose which one
              the marketplace keeps.
            </p>
          </div>
          <span className="btn-ghost btn-sm">Review conflicts →</span>
        </Link>
      )}

      <div className="card overflow-x-auto">
        <table className="table-wt">
          <thead>
            <tr><th>Domain</th><th>Publisher</th><th>DR</th><th>Traffic</th><th>Price</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id}>
                <td className="font-semibold">
                  <a href={l.url || `https://${l.domain}`} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-wt-green hover:underline">
                    {l.domain} ↗
                  </a>
                  <div className="muted text-xs">
                    {l.country}
                    {l.markupModel === "requested" && (
                      <span className="badge badge-yellow ml-2">requested</span>
                    )}
                  </div>
                </td>
                <td className="muted">{l.publisher.name}</td>
                {/* A DA is a publisher's claim, so show the real Ahrefs DR
                    beside it - a site claiming DA 70 that Ahrefs rates DR 2 is
                    then obvious at the moment of approving. */}
                <td>
                  <span className="font-semibold">
                    {authorityFor(l).label} {authorityFor(l).value}
                  </span>
                  {isClaimedAuthority(l) && (
                    <div className="muted text-xs">Ahrefs DR {l.domainRating}</div>
                  )}
                </td>
                <td>{trafficShort(l.monthlyTraffic)}</td>
                <td>{money(l.priceCents)}</td>
                <td><StatusBadge status={l.status} /></td>
                <td>
                  <div className="flex gap-2">
                    {/* A conflict must be settled against its rival, not simply
                        approved here - approving it directly would leave two
                        listings live on the same domain. */}
                    {l.status === "conflict" ? (
                      <Link href="/admin/conflicts" className="btn-accent btn-sm">Compare prices</Link>
                    ) : (
                      l.status !== "approved" && (
                        <form action={approveListingAction}><input type="hidden" name="id" value={l.id} /><button className="btn-primary btn-sm" type="submit">Approve</button></form>
                      )
                    )}
                    {l.status !== "rejected" && (
                      <form action={rejectListingAction}><input type="hidden" name="id" value={l.id} /><button className="btn-danger btn-sm" type="submit">Reject</button></form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
