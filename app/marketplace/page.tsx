import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ListingCard from "@/components/ListingCard";
import SearchSelect from "@/components/SearchSelect";
import { Flash } from "@/components/ui";
import { NICHES, COUNTRIES, LANGUAGES } from "@/lib/data";
import { centsFromUsd, STANDARD_MARKUP_CENTS } from "@/lib/money";
import { one } from "@/lib/util";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketplace",
  description:
    "Browse vetted African publisher sites and acquire quality backlinks and guest posts.",
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await getCurrentUser();
  if (user?.role === "publisher") redirect("/dashboard");
  const qStr = one(searchParams.q).trim();
  const country = one(searchParams.country);
  const niche = one(searchParams.niche);
  const language = one(searchParams.language);
  const min = parseFloat(one(searchParams.min));
  const max = parseFloat(one(searchParams.max));

  const where: any = { status: "approved" };
  if (qStr) where.domain = { contains: qStr };
  if (country) where.country = country;
  if (niche) where.category = { contains: niche };
  if (language) where.language = language;
  // Buyers filter on the price they see (publisher price + standard markup),
  // so translate the bounds back to the stored publisher price.
  if (!isNaN(min) || !isNaN(max)) {
    where.priceCents = {};
    if (!isNaN(min)) where.priceCents.gte = centsFromUsd(min) - STANDARD_MARKUP_CENTS;
    if (!isNaN(max)) where.priceCents.lte = centsFromUsd(max) - STANDARD_MARKUP_CENTS;
  }

  // Guests see a sample of six, then a sign-up call to action.
  // Signed-in buyers see 30 per page with Next / Previous paging.
  const PAGE_SIZE = 30;
  const page = Math.max(1, parseInt(one(searchParams.page) || "1") || 1);

  let listings;
  let totalPages = 1;
  if (user) {
    const total = await prisma.listing.count({ where });
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    listings = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  } else {
    listings = await prisma.listing.findMany({ where, orderBy: { createdAt: "desc" }, take: 6 });
  }

  // Preserve active filters when moving between pages.
  const filterParams = new URLSearchParams();
  for (const k of ["q", "country", "language", "niche", "min", "max"]) {
    const v = one(searchParams[k as keyof typeof searchParams] as any);
    if (v) filterParams.set(k, v);
  }
  const pageHref = (p: number) => {
    const s = new URLSearchParams(filterParams);
    s.set("page", String(p));
    return `/marketplace?${s.toString()}`;
  };

  return (
    <div>
      <h1 className="h2 mb-1">Marketplace</h1>
      <p className="muted mb-6">Browse vetted sites and acquire your placement.</p>
      <Flash searchParams={searchParams} />

      {user && (
        <form className="card mb-6 grid gap-4 md:grid-cols-6" method="get">
          <label className="field mb-0 md:col-span-2">
            <span>Search domain</span>
            <input className="input" name="q" defaultValue={qStr} placeholder="e.g. konemedia" />
          </label>
          <div className="field mb-0">
            <span>Country</span>
            <SearchSelect name="country" options={COUNTRIES} defaultValue={country} title="Filter by country" />
          </div>
          <div className="field mb-0">
            <span>Language</span>
            <SearchSelect name="language" options={LANGUAGES} defaultValue={language} title="Filter by language" />
          </div>
          <div className="field mb-0">
            <span>Niche</span>
            <SearchSelect name="niche" options={NICHES} defaultValue={niche} title="Filter by niche" />
          </div>
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
          <div className="md:col-span-6">
            <button className="btn-primary btn-sm" type="submit">Apply filters</button>
          </div>
        </form>
      )}

      {listings.length === 0 ? (
        <div className="card muted">No sites match your filters yet.</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {user && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn-ghost btn-sm">← Previous</Link>
          ) : (
            <span className="btn-ghost btn-sm cursor-not-allowed opacity-40">← Previous</span>
          )}
          <span className="muted text-sm">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="btn-ghost btn-sm">Next →</Link>
          ) : (
            <span className="btn-ghost btn-sm cursor-not-allowed opacity-40">Next →</span>
          )}
        </div>
      )}

      {!user && (
        <div className="mt-8 overflow-hidden rounded-lg band-green p-8 text-center text-black md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">See every site and acquire placements</h2>
          <p className="mx-auto mt-2 max-w-xl text-black/80">
            Create a free account to unlock the full marketplace and order from our publishers.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-pill bg-black px-8 py-3 text-[15px] font-bold uppercase tracking-[0.75px] text-white hover:bg-black/80"
          >
            Sign up to acquire from publishers
          </Link>
        </div>
      )}
    </div>
  );
}
