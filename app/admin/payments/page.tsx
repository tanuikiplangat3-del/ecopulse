import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/money";

export const metadata = { title: "Payment history" };

export default async function AdminPayments() {
  await requireRole("admin");

  const [deposits, payouts] = await Promise.all([
    prisma.walletTx.findMany({
      where: { kind: "topup" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.order.findMany({
      where: { publisherPaid: true },
      include: { listing: { include: { publisher: true } } },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
  ]);

  const totalIn = deposits.reduce((s, d) => s + d.amountCents, 0);
  const totalOut = payouts.reduce((s, o) => s + o.payoutCents, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h2">Payment history</h1>
        <Link href="/admin/orders" className="btn-ghost btn-sm">← Orders</Link>
      </div>

      <div className="mb-8 grid gap-5 sm:grid-cols-2">
        <div className="card"><p className="muted text-sm">Total deposited (net of fees)</p><p className="text-3xl font-bold text-wt-green">{money(totalIn)}</p></div>
        <div className="card"><p className="muted text-sm">Total paid out to publishers</p><p className="text-3xl font-bold">{money(totalOut)}</p></div>
      </div>

      <h2 className="h3 mb-3">Deposits in</h2>
      {deposits.length === 0 ? (
        <div className="card muted mb-10">No deposits yet.</div>
      ) : (
        <div className="card mb-10 overflow-x-auto">
          <table className="table-wt">
            <thead><tr><th>Date</th><th>Buyer</th><th>Amount added</th><th>Method</th></tr></thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.id}>
                  <td className="muted">{d.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="font-semibold">{d.user?.name || "-"}</td>
                  <td className="text-wt-green">{money(d.amountCents)}</td>
                  <td className="muted">{d.method || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="h3 mb-3">Payments out</h2>
      {payouts.length === 0 ? (
        <div className="card muted">No publisher payments yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-wt">
            <thead><tr><th>Date</th><th>Order</th><th>Publisher</th><th>Site</th><th>Amount</th></tr></thead>
            <tbody>
              {payouts.map((o) => (
                <tr key={o.id}>
                  <td className="muted">{o.updatedAt.toISOString().slice(0, 10)}</td>
                  <td>#{o.id}</td>
                  <td className="font-semibold">{o.listing.publisher.name}</td>
                  <td className="muted">{o.listing.domain}</td>
                  <td>{money(o.payoutCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
