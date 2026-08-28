import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money, trafficShort } from "@/lib/money";
import { StatusBadge, Flash, EmptyState } from "@/components/ui";
import { deleteListingAction } from "@/app/actions/listings";

export default async function MyListingsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const user = await requireRole("publisher");
  const listings = await prisma.listing.findMany({ where: { publisherId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="h2">My sites</h1>
        <Link href="/new-listing" className="btn-primary">Add a site</Link>
      </div>
      <Flash searchParams={searchParams} />

      {listings.length === 0 ? (
        <EmptyState title="No sites yet" hint="List your first website to start receiving orders." cta={{ href: "/new-listing", label: "Add a site" }} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-wt">
            <thead>
              <tr><th>Domain</th><th>DR</th><th>Traffic</th><th>Your price</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="font-semibold">{l.domain}<div className="muted text-xs">{l.country}</div></td>
                  <td>{l.domainRating}</td>
                  <td>{trafficShort(l.monthlyTraffic)}</td>
                  <td>{money(l.priceCents)}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>
                    <form action={deleteListingAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="btn-danger btn-sm" type="submit">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
