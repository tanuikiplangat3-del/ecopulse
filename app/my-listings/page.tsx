import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money, trafficShort } from "@/lib/money";
import { StatusBadge, Flash, EmptyState } from "@/components/ui";
import { deleteListingAction, changeAuthorityAction } from "@/app/actions/listings";
import { authorityFor } from "@/lib/authority";

export default async function MyListingsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const user = await requireRole("publisher");
  const listings = await prisma.listing.findMany({ where: { publisherId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="h2">Websites</h1>
        <div className="flex gap-2">
          <Link href="/bulk-upload" className="btn-ghost btn-sm">Upload sheet</Link>
          <Link href="/new-listing" className="btn-primary btn-sm">Add a website</Link>
        </div>
      </div>
      <Flash searchParams={searchParams} />

      {listings.length === 0 ? (
        <EmptyState title="No sites yet" hint="List your first website to start receiving orders." cta={{ href: "/new-listing", label: "Add a site" }} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-wt">
            <thead>
              <tr><th>Domain</th><th>Authority</th><th>Traffic</th><th>Your price</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="font-semibold">
                    <a href={l.url || `https://${l.domain}`} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-wt-green hover:underline">
                      {l.domain} ↗
                    </a>
                    <div className="muted text-xs">{l.country}</div>
                  </td>
                  <td>
                    <span className="muted mr-1 text-xs">{authorityFor(l).label}</span>
                    {authorityFor(l).value}
                  </td>
                  <td>{trafficShort(l.monthlyTraffic)}</td>
                  <td>{money(l.priceCents)}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>
                    <div className="flex flex-col items-start gap-2">
                      {/* A plain <details> rather than a modal: this is a server
                          component and the row should stay quiet until someone
                          actually wants to change the number. */}
                      <details className="w-full">
                        <summary className="btn-ghost btn-sm cursor-pointer list-none">
                          Change {authorityFor(l).label}
                        </summary>
                        <form action={changeAuthorityAction} className="mt-2 space-y-2">
                          <input type="hidden" name="id" value={l.id} />
                          <select
                            className="select"
                            name="authorityType"
                            defaultValue={authorityFor(l).label === "DA" ? "da" : "dr"}
                          >
                            <option value="dr">Show Domain Rating (from Ahrefs)</option>
                            <option value="da">Show Domain Authority (enter it)</option>
                          </select>
                          <input
                            className="input"
                            name="domainAuthority"
                            type="number"
                            min="1"
                            max="100"
                            placeholder="DA, e.g. 45"
                            defaultValue={l.domainAuthority || ""}
                          />
                          <p className="muted text-xs">
                            Changing this sends the website back to our team to check before
                            buyers see it.
                          </p>
                          <button className="btn-primary btn-sm" type="submit">Save</button>
                        </form>
                      </details>
                      <form action={deleteListingAction}>
                        <input type="hidden" name="id" value={l.id} />
                        <button className="btn-danger btn-sm" type="submit">Delete</button>
                      </form>
                    </div>
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
