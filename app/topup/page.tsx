import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/money";
import { Flash } from "@/components/ui";
import { startTopupAction } from "@/app/actions/wallet";
import { stripeEnabled } from "@/lib/stripe";

export default async function TopupPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const user = await requireRole("buyer");
  const txs = await prisma.walletTx.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="h2 mb-1">Wallet</h1>
      <p className="muted mb-6">Top up your balance to pay for orders instantly.</p>
      <Flash searchParams={searchParams} />

      <div className="card mb-5">
        <p className="muted text-sm">Current balance</p>
        <p className="mb-4 text-3xl font-bold text-wt-green">{money(user.balanceCents)}</p>
        <form action={startTopupAction} className="flex items-end gap-3">
          <label className="field mb-0 flex-1">
            <span>Amount (USD)</span>
            <input className="input" name="amount" type="number" min="5" step="1" placeholder="50" required />
          </label>
          <button className="btn-primary" type="submit" disabled={!stripeEnabled()}>Top up</button>
        </form>
        <p className="muted mt-3 text-xs">A 5% service fee applies.</p>
      </div>

      {txs.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="h3 mb-3">Recent activity</h2>
          <table className="table-wt">
            <thead><tr><th>Type</th><th>Amount</th><th>Note</th><th>Date</th></tr></thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id}>
                  <td className="capitalize">{t.kind}</td>
                  <td className={t.kind === "spend" ? "text-red-300" : "text-wt-green"}>{t.kind === "spend" ? "-" : "+"}{money(t.amountCents)}</td>
                  <td className="muted">{t.note}</td>
                  <td className="muted">{t.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
