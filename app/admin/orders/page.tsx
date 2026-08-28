import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/money";
import { StatusBadge, Flash } from "@/components/ui";
import { markPublisherPaidAction } from "@/app/actions/admin";

export default async function AdminOrders({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  await requireRole("admin");
  const orders = await prisma.order.findMany({
    include: { listing: { include: { publisher: true } }, buyer: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="h2 mb-1">Orders</h1>
      <p className="muted mb-6">All marketplace orders. Pay publishers once an order is completed.</p>
      <Flash searchParams={searchParams} />

      <div className="card overflow-x-auto">
        <table className="table-wt">
          <thead>
            <tr><th>#</th><th>Site</th><th>Buyer</th><th>Publisher</th><th>Amount</th><th>Payout</th><th>Status</th><th>Payout done</th><th></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/orders/${o.id}`} className="text-wt-green">{o.id}</Link></td>
                <td className="font-semibold">{o.listing.domain}</td>
                <td className="muted">{o.buyer.name}</td>
                <td className="muted">{o.listing.publisher.name}</td>
                <td>{money(o.amountCents)}</td>
                <td>{money(o.payoutCents)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.publisherPaid ? <span className="badge badge-green">paid</span> : <span className="badge badge-muted">no</span>}</td>
                <td>
                  {o.status === "completed" && !o.publisherPaid && (
                    <form action={markPublisherPaidAction}><input type="hidden" name="orderId" value={o.id} /><button className="btn-primary btn-sm" type="submit">Mark paid</button></form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
