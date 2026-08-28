import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { StatusBadge, Flash, EmptyState } from "@/components/ui";

export default async function OrdersPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const user = await requireUser();

  const where =
    user.role === "buyer"
      ? { buyerId: user.id }
      : user.role === "publisher"
      ? { listing: { publisherId: user.id } }
      : {};

  const orders = await prisma.order.findMany({
    where,
    include: { listing: true, buyer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="h2 mb-1">Orders</h1>
      <p className="muted mb-6">
        {user.role === "buyer" ? "Your placement orders." : user.role === "publisher" ? "Orders on your sites." : "All orders."}
      </p>
      <Flash searchParams={searchParams} />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          hint={user.role === "buyer" ? "Browse the marketplace to place your first order." : "Orders will appear here."}
          cta={user.role === "buyer" ? { href: "/marketplace", label: "Browse sites" } : undefined}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-wt">
            <thead>
              <tr>
                <th>#</th><th>Site</th>
                {user.role !== "buyer" && <th>Buyer</th>}
                <th>{user.role === "publisher" ? "Payout" : "Amount"}</th>
                <th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td className="font-semibold">{o.listing.domain}</td>
                  {user.role !== "buyer" && <td className="muted">{o.buyer.name}</td>}
                  <td>{money(user.role === "publisher" ? o.payoutCents : o.amountCents)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><Link href={`/orders/${o.id}`} className="text-wt-green">Open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
