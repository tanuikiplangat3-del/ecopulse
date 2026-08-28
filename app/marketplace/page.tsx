import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ListingCard from "@/components/ListingCard";
import UndergroundSelect from "@/components/UndergroundSelect";
import { Flash } from "@/components/ui";
import { NICHES, COUNTRIES, LANGUAGES } from "@/lib/data";
import { centsFromUsd } from "@/lib/money";
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
  if (!isNaN(min) || !isNaN(max)) {
    where.priceCents = {};
    if (!isNaN(min)) where.priceCents.gte = centsFromUsd(min);
    if (!isNaN(max)) where.priceCents.lte = centsFromUsd(max);
  }

  // Guests see a sample of six, then a sign-up call to action.
  const listings = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: user ? 60 : 6,
  });

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
            <UndergroundSelect name="country" options={COUNTRIES} coreCount={5} defaultValue={country} />
          </div>
          <div className="field mb-0">
            <span>Language</span>
            <UndergroundSelect name="language" options={LANGUAGES} coreCount={5} defaultValue={language} />
          </div>
          <div className="field mb-0">
            <span>Niche</span>
            <UndergroundSelect name="niche" options={NICHES} coreCount={5} defaultValue={niche} />
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
