import Link from "next/link";
import { money, buyerPrice, trafficShort } from "@/lib/money";
import { linkTypeLabel } from "@/lib/data";

type L = {
  id: number;
  domain: string;
  url: string;
  country: string;
  category: string;
  domainRating: number;
  monthlyTraffic: number;
  linkType: string;
  priceCents: number;
};

export default function ListingCard({ listing }: { listing: L }) {
  const niches = listing.category.split(",").filter(Boolean).slice(0, 3);
  const siteUrl = listing.url || `https://${listing.domain}`;
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
          <p className="muted text-sm">{listing.country}</p>
        </div>
        <span className="badge badge-green whitespace-nowrap">{money(buyerPrice(listing.priceCents))}</span>
      </div>

      <div className="mt-4 flex gap-4 text-sm">
        <div>
          <p className="muted text-xs">DR</p>
          <p className="font-semibold">{listing.domainRating}</p>
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
