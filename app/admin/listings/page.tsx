import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money, trafficShort } from "@/lib/money";
import { StatusBadge, Flash } from "@/components/ui";
import { approveListingAction, rejectListingAction, approveAllListingsAction, refreshListingMetricsAction } from "@/app/actions/admin";

export default async function AdminListings({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  await requireRole("admin");
  const listings = await prisma.listing.findMany({ include: { publisher: true }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const staleCount = listings.filter((l) => l.domainRating === 0 && l.monthlyTraffic === 0).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="h2">Listings</h1>
        <div className="flex gap-2">
          {staleCount > 0 && (
            <form action={refreshListingMetricsAction}>
              <button className="btn-ghost btn-sm" type="submit">Refresh DR &amp; traffic ({staleCount} at 0)</button>
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

      <div className="card overflow-x-auto">
        <table className="table-wt">
          <thead>
            <tr><th>Domain</th><th>Publisher</th><th>DR</th><th>Traffic</th><th>Price</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id}>
                <td className="font-semibold">{l.domain}<div className="muted text-xs">{l.country}</div></td>
                <td className="muted">{l.publisher.name}</td>
                <td>{l.domainRating}</td>
                <td>{trafficShort(l.monthlyTraffic)}</td>
                <td>{money(l.priceCents)}</td>
                <td><StatusBadge status={l.status} /></td>
                <td>
                  <div className="flex gap-2">
                    {l.status !== "approved" && (
                      <form action={approveListingAction}><input type="hidden" name="id" value={l.id} /><button className="btn-primary btn-sm" type="submit">Approve</button></form>
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
