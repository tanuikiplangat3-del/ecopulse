import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money, trafficShort } from "@/lib/money";
import { StatusBadge } from "@/components/ui";

export const metadata = { title: "Publisher" };

export default async function AdminPublisherPage({ params }: { params: { id: string } }) {
  await requireRole("admin");
  const id = parseInt(params.id);
  const pub = await prisma.user.findUnique({ where: { id } });
  if (!pub) notFound();

  const [listings, earnedAgg] = await Promise.all([
    prisma.listing.findMany({ where: { publisherId: id }, orderBy: { createdAt: "desc" } }),
    prisma.order.aggregate({ _sum: { payoutCents: true }, where: { listing: { publisherId: id }, status: "completed" } }),
  ]);
  const earned = earnedAgg._sum.payoutCents || 0;

  return (
    <div>
      <Link href="/admin/users" className="muted text-sm">← All users</Link>
      <h1 className="h2 mb-1 mt-2">{pub.name}</h1>
      <p className="muted mb-6">{pub.email} · {pub.role}</p>

      <div className="mb-6 grid gap-5 sm:grid-cols-3">
        <div className="card"><p className="muted text-sm">Websites</p><p className="text-3xl font-bold">{listings.length}</p></div>
        <div className="card"><p className="muted text-sm">Total earned</p><p className="text-3xl font-bold text-wt-green">{money(earned)}</p></div>
        <div className="card"><p className="muted text-sm">Total paid out</p><p className="text-3xl font-bold">{money(pub.withdrawnCents || 0)}</p></div>
      </div>

      <div className="card mb-6">
        <h2 className="h3 mb-2">Payment details</h2>
        <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          <Row label="Method" value={pub.payMethod} />
          <Row label="Country" value={pub.payCountry} />
          <Row label="M-Pesa" value={pub.payMpesa} />
          <Row label="Bank" value={pub.payBank} />
          <Row label="PayPal" value={pub.payPaypal} />
          <Row label="Other" value={pub.payCard} />
        </dl>
      </div>

      <h2 className="h3 mb-3">Websites and prices</h2>
      <div className="card overflow-x-auto">
        <table className="table-wt">
          <thead>
            <tr><th>Domain</th><th>Country</th><th>DR</th><th>Traffic</th><th>Price</th><th>Status</th></tr>
          </thead>
          <tbody>
            {listings.length === 0 && (<tr><td colSpan={6} className="muted">No websites listed.</td></tr>)}
            {listings.map((l) => (
              <tr key={l.id}>
                <td className="font-semibold">{l.domain}</td>
                <td className="muted">{l.country}</td>
                <td>{l.domainRating}</td>
                <td>{trafficShort(l.monthlyTraffic)}</td>
                <td>{money(l.priceCents)}</td>
                <td><StatusBadge status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-1">
      <dt className="muted">{label}</dt>
      <dd>{value || "not set"}</dd>
    </div>
  );
}
