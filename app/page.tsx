import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ListingCard from "@/components/ListingCard";
import LogoReveal from "@/components/LogoReveal";
import { centsFromUsd, publisherPriceFromBuyer } from "@/lib/money";

export const dynamic = "force-dynamic";

const SITE = "https://tools.welcometomorrow.io";
const PATH = "/linktomorrow";

// SEO metadata is generated dynamically from live marketplace data.
export async function generateMetadata(): Promise<Metadata> {
  let sites = 0;
  let countries = 0;
  try {
    sites = await prisma.listing.count({ where: { status: "approved" } });
    const grouped = await prisma.listing.findMany({
      where: { status: "approved" },
      distinct: ["country"],
      select: { country: true },
    });
    countries = grouped.length;
  } catch {
    // database not reachable at build time - fall back to static copy
  }

  const description =
    sites > 0
      ? `Acquire quality backlinks and guest posts from ${sites}+ vetted publisher websites across ${countries || 54} African markets. Escrow-protected orders, transparent pricing, and verified placements with Welcome Tomorrow.`
      : "Acquire quality backlinks and guest posts from vetted African publishers. Escrow-protected orders, transparent pricing, and verified placements with Welcome Tomorrow.";

  // The layout's title template appends " | Link Tomorrow".
  const title = "Best Backlink Marketplace in Africa";

  return {
    title,
    description,
    keywords: [
      "link building", "backlinks", "guest posts", "niche edits",
      "backlink marketplace", "African publishers", "buy backlinks Africa",
      "SEO link building", "Welcome Tomorrow",
    ],
    alternates: { canonical: `${SITE}${PATH}` },
    openGraph: {
      type: "website",
      title: `${title} | Link Tomorrow`,
      description,
      url: `${SITE}${PATH}`,
      siteName: "Link Tomorrow",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function HomePage() {
  const user = await getCurrentUser();
  // The home page is for signed-out visitors only. Send members to their surface.
  if (user) redirect(user.role === "buyer" ? "/marketplace" : "/dashboard");

  // Featured = strong sites that are still affordable: DR 50+ and a buyer price
  // under $300. The markup varies by band, so work back from the $300 the buyer
  // would see to the publisher price that produces it.
  const featured = await prisma.listing.findMany({
    where: {
      status: "approved",
      domainRating: { gte: 50 },
      priceCents: { lt: publisherPriceFromBuyer(centsFromUsd(300)) },
    },
    orderBy: { domainRating: "desc" },
    take: 6,
  });

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-4xl py-12 text-center md:py-20">
        {/* Plays once per visitor, then simply renders. See LogoReveal. */}
        <LogoReveal className="mb-8" />
        <span className="badge badge-green mb-6 block">Link Building Marketplace</span>
        <h1 className="h1">
          Build your backlink profile with <span className="text-wt-green">Welcome Tomorrow</span>
        </h1>
        <p className="muted mx-auto mt-6 max-w-measure text-lg">
          Acquire quality backlinks and guest posts from vetted African publishers. Orders
          are escrow protected, pricing is transparent, and every placement is verified.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/marketplace" className="btn-primary">Browse the marketplace</Link>
          <Link href="/register" className="btn-ghost">Create a free account</Link>
        </div>
      </section>

      {/* Featured sites */}
      <section className="mt-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="h3">Featured sites</h2>
          <Link href="/marketplace" className="text-sm font-semibold text-wt-green">
            View all
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="card muted">New publisher websites are being added. Please check back soon.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* Become a publisher */}
      <section className="mt-10 overflow-hidden rounded-lg border border-wt-border bg-wt-surface1 p-8 md:p-12">
        <div className="grid items-center gap-6 md:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Are you a reputable publisher?</h2>
            <p className="muted mt-3 max-w-xl">
              If you own a website with good authority and constant traffic, request to be listed
              on the Welcome Tomorrow marketplace. Our team reviews every site before it goes live.
            </p>
          </div>
          <div className="md:text-right">
            <Link href="/apply" className="btn-accent">Request to be listed</Link>
          </div>
        </div>
      </section>

      {/* Sign up CTA */}
      <section className="mt-8 overflow-hidden rounded-lg band-green p-8 text-center text-black md:p-12">
        <h3 className="text-2xl font-bold md:text-3xl">Ready to build your backlink profile?</h3>
        <p className="mx-auto mt-2 max-w-xl text-black/80">
          Create an account to acquire placements from our vetted publishers across Africa.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-block rounded-pill bg-black px-8 py-3 text-[15px] font-bold uppercase tracking-[0.75px] text-white hover:bg-black/80"
        >
          Sign up to acquire from publishers
        </Link>
      </section>
    </div>
  );
}
