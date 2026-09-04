import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewerAccess, FREE_PREVIEW_COUNT } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { money, buyerPrice, trafficShort } from "@/lib/money";
import { linkTypeLabel } from "@/lib/data";
import { requesterOrdersLeft } from "@/lib/requester";
import { placeOrderAction } from "@/app/actions/orders";
import { Flash } from "@/components/ui";

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const id = parseInt(params.id);
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.status !== "approved") notFound();
  const user = await getCurrentUser();

  // Paywall. Without this check a locked visitor could simply type a listing URL
  // and read everything the marketplace was hiding. A listing is open only if it
  // falls inside the free preview - the newest FREE_PREVIEW_COUNT approved sites,
  // which is exactly the set the marketplace shows unblurred.
  const access = await getViewerAccess(user);
  if (!access.unlocked) {
    const newerCount = await prisma.listing.count({
      where: { status: "approved", createdAt: { gt: listing!.createdAt } },
    });
    if (newerCount >= FREE_PREVIEW_COUNT) {
      redirect(user ? "/topup?locked=1" : "/register");
    }
  }

  const niches = listing.category.split(",").filter(Boolean);

  // Buyer-requested sites: does this viewer still get the rate they negotiated,
  // and how many of those orders are left?
  const ordersLeft = await requesterOrdersLeft(user?.id, listing!);
  const requesterRate = ordersLeft > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Details */}
      <div className="lg:col-span-2">
        <Link href="/marketplace" className="muted text-sm">← Back to marketplace</Link>
        <h1 className="h2 mb-1 mt-2 flex flex-wrap items-baseline gap-3">
          {listing.domain}
          <a
            href={listing.url || `https://${listing.domain}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sm font-semibold text-wt-green hover:underline"
          >
            Visit site ↗
          </a>
        </h1>
        <p className="muted mb-5">{listing.country} · {listing.language}</p>

        <div className="card mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><p className="muted text-xs">Domain Rating</p><p className="text-xl font-bold">{listing.domainRating}</p></div>
          <div><p className="muted text-xs">Monthly Traffic</p><p className="text-xl font-bold">{trafficShort(listing.monthlyTraffic)}</p></div>
          <div><p className="muted text-xs">Turnaround</p><p className="text-xl font-bold">{listing.tatDays}d</p></div>
          <div><p className="muted text-xs">Type</p><p className="text-lg font-bold">{linkTypeLabel(listing.linkType)}</p></div>
        </div>

        {niches.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {niches.map((n) => (<span key={n} className="badge badge-muted">{n}</span>))}
          </div>
        )}

        {listing.description && (
          <div className="card">
            <h2 className="h3 mb-2">About this placement</h2>
            <p className="text-white/80">{listing.description}</p>
          </div>
        )}
      </div>

      {/* Order box */}
      <div>
        <div className="card sticky top-20">
          <p className="muted text-sm">Price</p>
          <p className="mb-1 text-3xl font-bold text-wt-green">{money(
            buyerPrice(listing.priceCents, listing.markupModel, {
              vatPercent: listing.vatPercent,
              requesterRate,
            })
          )}</p>
          {requesterRate && (
            <p className="muted mb-4 text-xs">
              Your negotiated rate, on {ordersLeft} more order{ordersLeft === 1 ? "" : "s"}. After
              that this site prices at the standard rate of{" "}
              {money(buyerPrice(listing.priceCents, listing.markupModel, { vatPercent: listing.vatPercent }))}.
            </p>
          )}
          {!requesterRate && <div className="mb-4" />}
          <Flash searchParams={searchParams} />

          {!user && (
            <>
              <p className="muted mb-4 text-sm">Sign in as a buyer to place an order.</p>
              <Link href="/login" className="btn-primary w-full">Sign in to order</Link>
            </>
          )}

          {user && user.role === "buyer" && (
            <form action={placeOrderAction} encType="multipart/form-data">
              <input type="hidden" name="listingId" value={listing.id} />
              <label className="field">
                <span>Your target URL</span>
                <input className="input" name="targetUrl" placeholder="https://yoursite.com/page" required />
              </label>
              <label className="field">
                <span>Anchor text</span>
                <input className="input" name="anchorText" placeholder="e.g. best running shoes" required />
              </label>
              <label className="field">
                <span>Turnaround</span>
                <select className="select" name="turnaroundDays" defaultValue="7">
                  <option value="5">5 days</option>
                  <option value="7">7 days</option>
                  <option value="10">10 days</option>
                </select>
              </label>
              <label className="field">
                <span>Guest post document (Word / PDF)</span>
                <input
                  className="input file:mr-3 file:rounded-sm file:border-0 file:bg-wt-green file:px-4 file:py-1.5 file:text-white"
                  type="file"
                  name="articleDoc"
                  accept=".doc,.docx,.pdf,.txt,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
              </label>
              <label className="field">
                <span>Featured image (optional)</span>
                <input
                  className="input file:mr-3 file:rounded-sm file:border-0 file:bg-wt-green file:px-4 file:py-1.5 file:text-white"
                  type="file"
                  name="featuredImageFile"
                  accept="image/*"
                />
              </label>
              <label className="field">
                <span>Article text / instructions (optional)</span>
                <textarea className="textarea" name="articleContent" placeholder="Paste your article or leave instructions for the publisher" />
              </label>
              <label className="field">
                <span>Notes (optional)</span>
                <input className="input" name="notes" placeholder="Anything else" />
              </label>
              <button className="btn-primary w-full" type="submit">Place order</button>
              <p className="muted mt-3 text-center text-xs">You&apos;ll pay on the next step. Funds are held until the link is live.</p>
            </form>
          )}

          {user && user.role !== "buyer" && (
            <p className="muted text-sm">Only buyer accounts can place orders.</p>
          )}
        </div>
      </div>
    </div>
  );
}
