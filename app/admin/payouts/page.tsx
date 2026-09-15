import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Flash } from "@/components/ui";
import { decidePayoutMethodAction } from "@/app/actions/payouts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payout methods" };

/** What the publisher actually typed, for whichever method they chose. */
function detailsOf(u: any): string {
  if (u.payMethod === "mpesa") return u.payMpesa || "";
  if (u.payMethod === "bank") return u.payBank || "";
  if (u.payMethod === "paypal") return u.payPaypal || "";
  return u.payCard || "";
}

export default async function AdminPayouts({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  await requireRole("admin");

  const [pending, decided] = await Promise.all([
    prisma.user.findMany({
      where: { role: "publisher", payStatus: "pending" },
      orderBy: { payRequestedAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "publisher", payStatus: { in: ["rejected"] } },
      orderBy: { payRequestedAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h2">Payout methods</h1>
          <p className="muted mt-1 max-w-2xl text-sm">
            PayPal is approved automatically. Anything else waits here. Each publisher has been told
            they will hear back within 24 hours, so clear this queue daily.
          </p>
        </div>
        <Link href="/admin" className="btn-ghost btn-sm">← Admin</Link>
      </div>

      <Flash searchParams={searchParams} />

      <h2 className="h3 mb-3">Waiting on you ({pending.length})</h2>
      {pending.length === 0 ? (
        <div className="card muted mb-10">Nothing to review.</div>
      ) : (
        <div className="mb-10 grid gap-5">
          {pending.map((u) => (
            <div key={u.id} className="card">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{u.name}</p>
                  <p className="muted text-sm">{u.email}</p>
                  <p className="muted text-xs">
                    Asked {u.payRequestedAt ? u.payRequestedAt.toISOString().slice(0, 16).replace("T", " ") : "-"}
                    {u.payCountry ? ` · ${u.payCountry}` : ""}
                  </p>
                </div>
                <span className="badge badge-yellow">{u.payMethod}</span>
              </div>

              <p className="mb-4 whitespace-pre-wrap rounded-md border border-wt-border bg-black/30 p-3 text-sm">
                {detailsOf(u) || "They gave no details."}
              </p>

              <form action={decidePayoutMethodAction} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <input type="hidden" name="userId" value={u.id} />
                <label className="field mb-0">
                  <span>Message to the publisher <span className="muted">(optional)</span></span>
                  <input className="input" name="note" placeholder="We can pay this one. / We cannot send to that country." />
                </label>
                <button className="btn-primary self-end" name="decision" value="approve" type="submit">
                  We can pay this
                </button>
                <button className="btn-danger self-end" name="decision" value="reject" type="submit">
                  We cannot
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <h2 className="h3 mb-3">Declined</h2>
      {decided.length === 0 ? (
        <div className="card muted">Nothing declined.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-wt">
            <thead><tr><th>Publisher</th><th>Method</th><th>What we told them</th></tr></thead>
            <tbody>
              {decided.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}<br /><span className="muted text-xs">{u.email}</span></td>
                  <td className="muted">{u.payMethod}</td>
                  <td className="muted">{u.payNote || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
