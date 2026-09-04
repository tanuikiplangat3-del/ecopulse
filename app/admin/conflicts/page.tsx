import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money, buyerPrice, trafficShort, MARKUP_REQUESTED } from "@/lib/money";
import { Flash } from "@/components/ui";
import { pendingConflicts, LIVE_STATUS } from "@/lib/duplicates";
import {
  keepCurrentListingAction,
  switchToNewListingAction,
  resolveAllCheapestAction,
} from "@/app/actions/conflicts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conflicts" };

type Row = {
  incoming: any;
  current: any | null;
};

export default async function AdminConflicts({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  await requireRole("admin");
  const conflicts = await pendingConflicts();

  // The live listing each newcomer is competing against - the cheapest one, as
  // that is the price the marketplace is currently showing. One query, then
  // matched up in memory, so a big upload does not fan out into hundreds.
  const domains = Array.from(new Set(conflicts.map((c) => c.domain)));
  const live = domains.length
    ? await prisma.listing.findMany({
        where: { domain: { in: domains }, status: LIVE_STATUS },
        orderBy: [{ priceCents: "asc" }, { createdAt: "asc" }],
        include: { publisher: { select: { name: true, email: true } } },
      })
    : [];
  const currentByDomain = new Map<string, any>();
  for (const l of live) if (!currentByDomain.has(l.domain)) currentByDomain.set(l.domain, l);

  const rows: Row[] = conflicts.map((incoming) => ({
    incoming,
    current: currentByDomain.get(incoming.domain) || null,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h2 mb-1">Conflicts</h1>
          <p className="muted">
            Websites submitted that we already list. Nothing changes on the marketplace until you
            decide.
          </p>
        </div>
        {rows.length > 1 && (
          <form action={resolveAllCheapestAction}>
            <button className="btn-ghost btn-sm" type="submit">
              Settle all {rows.length} by price (keep cheapest)
            </button>
          </form>
        )}
      </div>

      <Flash searchParams={searchParams} />

      {rows.length === 0 ? (
        <div className="card muted">
          No conflicts. Every website on the marketplace is unique.
        </div>
      ) : (
        <div className="grid gap-5">
          {rows.map(({ incoming, current }) => {
            const theirBuyer = buyerPrice(incoming.priceCents, incoming.markupModel, {
              vatPercent: incoming.vatPercent,
            });
            const ourBuyer = current
              ? buyerPrice(current.priceCents, current.markupModel, { vatPercent: current.vatPercent })
              : null;
            const diff = current ? incoming.priceCents - current.priceCents : 0;
            const cheaper = current ? incoming.priceCents < current.priceCents : true;

            return (
              <div key={incoming.id} className="card">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">
                      <a
                        href={incoming.url || `https://${incoming.domain}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="hover:text-wt-green hover:underline"
                      >
                        {incoming.domain} ↗
                      </a>
                    </p>
                    <p className="muted text-xs">
                      Submitted {incoming.createdAt.toISOString().slice(0, 10)}
                      {incoming.markupModel === MARKUP_REQUESTED && " · buyer-requested"}
                    </p>
                  </div>
                  {current && (
                    <span className={`badge ${cheaper ? "badge-green" : "badge-red"}`}>
                      {cheaper
                        ? `${money(Math.abs(diff))} cheaper`
                        : `${money(Math.abs(diff))} dearer`}
                    </span>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Side
                    heading="On the marketplace now"
                    listing={current}
                    buyerPays={ourBuyer}
                    highlight={!cheaper}
                  />
                  <Side
                    heading="Newly submitted"
                    listing={incoming}
                    buyerPays={theirBuyer}
                    highlight={cheaper}
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                  <form action={switchToNewListingAction}>
                    <input type="hidden" name="id" value={incoming.id} />
                    <button className="btn-primary btn-sm" type="submit">
                      Switch to the new listing
                    </button>
                  </form>
                  <form action={keepCurrentListingAction}>
                    <input type="hidden" name="id" value={incoming.id} />
                    <button className="btn-ghost btn-sm" type="submit">
                      Keep current — we have the better price
                    </button>
                  </form>
                  <Link href={`/admin/listings`} className="btn-ghost btn-sm">
                    View all listings
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Side({
  heading,
  listing,
  buyerPays,
  highlight,
}: {
  heading: string;
  listing: any | null;
  buyerPays: number | null;
  highlight: boolean;
}) {
  if (!listing) {
    return (
      <div className="rounded-md border border-white/10 bg-white/5 p-4">
        <p className="muted mb-2 text-xs uppercase tracking-wide">{heading}</p>
        <p className="muted text-sm">
          Nothing live on this domain any more — approving the new listing simply publishes it.
        </p>
      </div>
    );
  }
  return (
    <div
      className={`rounded-md border p-4 ${
        highlight ? "border-wt-green/50 bg-wt-green/5" : "border-white/10 bg-white/5"
      }`}
    >
      <p className="muted mb-3 text-xs uppercase tracking-wide">{heading}</p>
      <dl className="space-y-2 text-sm">
        <Row label="Publisher" value={listing.publisher?.name || "—"} />
        <Row label="Publisher price" value={money(listing.priceCents)} strong />
        <Row label="Buyer pays" value={buyerPays !== null ? money(buyerPays) : "—"} />
        <Row label="DR" value={String(listing.domainRating)} />
        <Row label="Traffic" value={trafficShort(listing.monthlyTraffic)} />
        <Row label="Turnaround" value={`${listing.tatDays} days`} />
        <Row label="Listed" value={listing.createdAt.toISOString().slice(0, 10)} />
      </dl>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="muted text-xs">{label}</dt>
      <dd className={strong ? "text-base font-bold text-wt-green" : "text-sm"}>{value}</dd>
    </div>
  );
}
