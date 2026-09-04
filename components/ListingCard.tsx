import Link from "next/link";
import { money, buyerPrice, trafficShort } from "@/lib/money";
import { linkTypeLabel } from "@/lib/data";
import { authorityFor } from "@/lib/authority";

type L = {
  id: number;
  domain: string;
  url: string;
  country: string;
  category: string;
  domainRating: number;
  // Optional so existing callers that select a narrower row still typecheck;
  // authorityFor() treats a missing type as DR, which is the old behaviour.
  authorityType?: string | null;
  domainAuthority?: number | null;
  monthlyTraffic: number;
  linkType: string;
  priceCents: number;
  markupModel?: string | null;
  requestedById?: number | null;
  vatPercent?: number | null;
};

export default function ListingCard({
  listing,
  locked = false,
  requesterRate = false,
}: {
  listing: L;
  locked?: boolean;
  // True only when this viewer is the buyer who brought us this publisher AND
  // still has reduced-rate orders left. Worked out in lib/requester.ts - never
  // by comparing requestedById here, or the discount would never expire.
  requesterRate?: boolean;
}) {
  const niches = listing.category.split(",").filter(Boolean).slice(0, 3);
  const siteUrl = listing.url || `https://${listing.domain}`;

  // Locked cards are already redacted server-side (see lib/access.ts); the blur
  // is only what the viewer sees. Nothing here is a link, so the card is inert.
  if (locked) {
    return (
      <div className="card relative overflow-hidden" aria-hidden="true">
        <div className="pointer-events-none select-none blur-[7px] saturate-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">hidden-website.com</p>
              <p className="muted text-sm">{listing.country}</p>
            </div>
            <span className="badge badge-green whitespace-nowrap">$000.00</span>
          </div>
          <div className="mt-4 flex gap-4 text-sm">
            <div><p className="muted text-xs">DR</p><p className="font-semibold">00</p></div>
            <div><p className="muted text-xs">Traffic</p><p className="font-semibold">00K</p></div>
            <div><p className="muted text-xs">Type</p><p className="font-semibold">Guest Post</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="badge badge-muted">Niche</span>
            <span className="badge badge-muted">Niche</span>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    // The whole card stays clickable via the stretched link on the domain below,
    // which leaves the "open the real site" link free to sit on top of it.
    <div className="card relative transition-colors hover:border-wt-green/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/listing/${listing.id}`}
              className="text-lg font-bold after:absolute after:inset-0 after:content-['']"
            >
              {listing.domain}
            </Link>
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={`Open ${listing.domain} in a new tab`}
              aria-label={`Open ${listing.domain} in a new tab`}
              className="relative z-10 text-white/50 transition-colors hover:text-wt-green"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
          <p className="muted text-sm">
            {listing.country}
            {requesterRate && <span className="badge badge-yellow ml-2">your rate</span>}
          </p>
        </div>
        <span className="badge badge-green whitespace-nowrap">{money(
            buyerPrice(listing.priceCents, listing.markupModel, {
              vatPercent: listing.vatPercent,
              requesterRate,
            })
          )}</span>
      </div>

      <div className="mt-4 flex gap-4 text-sm">
        <div>
          {/* DR or DA, whichever this publisher chose to display. */}
          <p className="muted text-xs">{authorityFor(listing).label}</p>
          <p className="font-semibold">{authorityFor(listing).value}</p>
        </div>
        <div>
          <p className="muted text-xs">Traffic</p>
          <p className="font-semibold">{trafficShort(listing.monthlyTraffic)}</p>
        </div>
        <div>
          <p className="muted text-xs">Type</p>
          <p className="font-semibold">{linkTypeLabel(listing.linkType)}</p>
        </div>
      </div>

      {niches.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {niches.map((n) => (
            <span key={n} className="badge badge-muted">{n}</span>
          ))}
        </div>
      )}
    </div>
  );
}
