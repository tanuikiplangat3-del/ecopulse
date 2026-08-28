import { prisma } from "@/lib/prisma";
import ListingCard from "@/components/ListingCard";
import { Flash } from "@/components/ui";
import { NICHES, COUNTRIES } from "@/lib/data";
import { centsFromUsd } from "@/lib/money";
import { one } from "@/lib/util";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const qStr = one(searchParams.q).trim();
  const country = one(searchParams.country);
  const niche = one(searchParams.niche);
  const min = parseFloat(one(searchParams.min));
  const max = parseFloat(one(searchParams.max));

  const where: any = { status: "approved" };
  if (qStr) where.domain = { contains: qStr };
  if (country) where.country = country;
  if (niche) where.category = { contains: niche };
  if (!isNaN(min) || !isNaN(max)) {
    where.priceCents = {};
    if (!isNaN(min)) where.priceCents.gte = centsFromUsd(min);
    if (!isNaN(max)) where.priceCents.lte = centsFromUsd(max);
  }

  const listings = await prisma.listing.findMany({ where, orderBy: { createdAt: "desc" }, take: 60 });

  return (
    <div>
      <h1 className="h2 mb-1">Marketplace</h1>
      <p className="muted mb-6">Browse vetted sites and order your placement.</p>
      <Flash searchParams={searchParams} />

      {/* Filters */}
      <form className="card mb-6 grid gap-4 md:grid-cols-5" method="get">
        <label className="field mb-0 md:col-span-2">
          <span>Search domain</span>
          <input className="input" name="q" defaultValue={qStr} placeholder="e.g. techdaily" />
        </label>
        <label className="field mb-0">
          <span>Country</span>
          <select className="select" name="country" defaultValue={country}>
            <option value="">Any</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field mb-0">
          <span>Niche</span>
          <select className="select" name="niche" defaultValue={niche}>
            <option value="">Any</option>
            {NICHES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="field mb-0">
            <span>Min $</span>
            <input className="input" name="min" type="number" min="0" defaultValue={one(searchParams.min)} />
          </label>
          <label className="field mb-0">
            <span>Max $</span>
            <input className="input" name="max" type="number" min="0" defaultValue={one(searchParams.max)} />
          </label>
        </div>
        <div className="md:col-span-5">
          <button className="btn-primary btn-sm" type="submit">Apply filters</button>
        </div>
      </form>

      {listings.length === 0 ? (
        <div className="card muted">No sites match your filters yet.</div>
      ) : (
        <>
          <p className="muted mb-4 text-sm">{listings.length} site{listings.length !== 1 ? "s" : ""} found</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
