import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/money";
import { StatusBadge, Flash } from "@/components/ui";
import { markPublisherPaidAction } from "@/app/actions/admin";
import { adminConfirmLiveAction } from "@/app/actions/orders";

export const metadata = { title: "Orders" };

export default async function AdminOrders({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  await requireRole("admin");

  const [toPay, inProgress] = await Promise.all([
    prisma.order.findMany({
      where: { publisherPaid: false, status: { in: ["live", "completed"] } },
      include: { listing: { include: { publisher: true } }, buyer: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      where: { status: { in: ["funded", "in_progress"] } },
      include: { listing: { include: { publisher: true } }, buyer: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const owed = toPay.reduce((s, o) => s + o.payoutCents, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h2">Orders</h1>
        <Link href="/admin/payments" className="btn-ghost btn-sm">Payment history →</Link>
      </div>
      <Flash searchParams={searchParams} />

      {/* Orders to be paid */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="h3">Orders to be paid</h2>
        <span className="muted text-sm">Total owed to publishers: <span className="font-bold text-wt-green">{money(owed)}</span></span>
      </div>
      {toPay.length === 0 ? (
        <div className="card muted mb-10">Nothing to pay right now.</div>
      ) : (
        <div className="card mb-10 overflow-x-auto">
          <table className="table-wt">
            <thead>
              <tr><th>#</th><th>Site</th><th>Buyer</th><th>Publisher</th><th>Payout</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {toPay.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/orders/${o.id}`} className="text-wt-green">{o.id}</Link></td>
                  <td className="font-semibold">{o.listing.domain}</td>
                  <td className="muted">{o.buyer.name}</td>
                  <td>
                    <Link href={`/admin/users/${o.listing.publisherId}`} className="text-wt-green hover:underline">
                      {o.listing.publisher.name}
                    </Link>
                    <span className="muted block text-xs">view payment details</span>
                  </td>
                  <td className="font-bold text-wt-green">{money(o.payoutCents)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {o.status === "live" && (
                        <form action={adminConfirmLiveAction}>
                          <input type="hidden" name="orderId" value={o.id} />
                          <button className="btn-ghost btn-sm" type="submit">Confirm live</button>
                        </form>
                      )}
                      <form action={markPublisherPaidAction}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <button className="btn-primary btn-sm" type="submit">Mark paid</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders in progress */}
      <h2 className="h3 mb-4">Orders in progress</h2>
      {inProgress.length === 0 ? (
        <div className="card muted">No orders in progress.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-wt">
            <thead>
              <tr><th>#</th><th>Site</th><th>Buyer</th><th>Publisher</th><th>Amount</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {inProgress.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/orders/${o.id}`} className="text-wt-green">{o.id}</Link></td>
                  <td className="font-semibold">{o.listing.domain}</td>
                  <td className="muted">{o.buyer.name}</td>
                  <td className="muted">{o.listing.publisher.name}</td>
                  <td>{money(o.amountCents)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><Link href={`/orders/${o.id}`} className="text-wt-green whitespace-nowrap">Open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
