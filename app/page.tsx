import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ListingCard from "@/components/ListingCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const featured = await prisma.listing.findMany({
    where: { status: "approved" },
    orderBy: { domainRating: "desc" },
    take: 6,
  });

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-10 text-center md:py-16">
        <span className="badge badge-green mb-5 inline-block">Link Building Marketplace</span>
        <h1 className="h1">
          Buy &amp; sell quality <span className="text-wt-green">backlinks</span> that actually rank
        </h1>
        <p className="muted mx-auto mt-5 max-w-measure text-lg">
          Order guest posts and niche edits from vetted publishers. Escrow-protected, transparent
          pricing, paid securely by card. Publishers are invite-only, so quality stays high.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/marketplace" className="btn-primary">Browse the marketplace</Link>
          {!user && <Link href="/register" className="btn-ghost">Create a free account</Link>}
        </div>
      </section>

      {/* Featured */}
      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="h3">Featured sites</h2>
          <Link href="/marketplace" className="text-sm text-wt-green">View all →</Link>
        </div>
        {featured.length === 0 ? (
          <div className="card muted">No listings yet. Check back soon.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
        {!user && (
          <p className="muted mt-6 text-center text-sm">
            <Link href="/login" className="text-wt-green">Sign in</Link> to see full details and place orders.
          </p>
        )}
      </section>
    </div>
  );
}
