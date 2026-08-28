import Link from "next/link";
import { money, buyerPrice, trafficShort } from "@/lib/money";
import { linkTypeLabel } from "@/lib/data";

type L = {
  id: number;
  domain: string;
  country: string;
  category: string;
  domainRating: number;
  monthlyTraffic: number;
  linkType: string;
  priceCents: number;
};

export default function ListingCard({ listing }: { listing: L }) {
  const niches = listing.category.split(",").filter(Boolean).slice(0, 3);
  return (
    <Link href={`/listing/${listing.id}`} className="card block transition-colors hover:border-wt-green/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{listing.domain}</p>
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
    </Link>
  );
}
