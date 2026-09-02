import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Flash, StatusBadge } from "@/components/ui";
import { money, buyerPrice, listingBaseCents, MARKUP_REQUESTED } from "@/lib/money";
import { approveSiteRequestAction, rejectSiteRequestAction } from "@/app/actions/site-requests";

export const dynamic = "force-dynamic";
export const metadata = { title: "Site requests" };

const PAY_LABEL: Record<string, string> = {
  paypal: "PayPal",
  bank: "Bank transfer",
  mpesa: "M-Pesa",
  other: "Other",
};

export default async function AdminSiteRequests({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  await requireRole("admin");
  const requests = await prisma.siteRequest.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  const buyerIds = Array.from(new Set(requests.map((r: any) => r.buyerId)));
  const buyers = await prisma.user.findMany({ where: { id: { in: buyerIds } } });
  const buyerById = new Map<number, any>(buyers.map((b: any) => [b.id, b]));
  const pending = requests.filter((r: any) => r.status === "pending").length;

  return (
    <div>
      <h1 className="h2 mb-1">Site requests</h1>
      <p className="muted mb-6">
        Publishers that buyers negotiated themselves. Approving lists the site immediately.
        {pending > 0 ? ` ${pending} awaiting review.` : " Nothing awaiting review."}
      </p>
      <Flash searchParams={searchParams} />

      {requests.length === 0 ? (
        <div className="card muted">No site requests yet.</div>
      ) : (
        <div className="grid gap-5">
          {requests.map((r: any) => {
            const buyer = buyerById.get(r.buyerId);
            const base = listingBaseCents(r.negotiatedCents, r.vatPercent);
            const requesterPays = buyerPrice(r.negotiatedCents, MARKUP_REQUESTED, {
              vatPercent: r.vatPercent,
              requesterRate: true,
            });
            const othersPay = buyerPrice(r.negotiatedCents, MARKUP_REQUESTED, { vatPercent: r.vatPercent });
            return (
              <div key={r.id} className="card">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">
                      <a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-wt-green hover:underline">
                        {r.domain} ↗
                      </a>
                    </p>
                    <p className="muted text-sm">
                      {r.siteName} · {r.country} · {r.language} · {r.category}
                    </p>
                    <p className="muted text-xs">
                      Requested by {buyer?.name || "unknown"} ({buyer?.email || "—"}) on{" "}
                      {r.createdAt.toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="mb-4 grid gap-4 rounded-md border border-wt-border bg-white/5 p-4 sm:grid-cols-4">
                  <div>
                    <p className="muted text-xs">Negotiated (publisher)</p>
                    <p className="text-lg font-bold">{money(r.negotiatedCents)}</p>
                  </div>
                  <div>
                    <p className="muted text-xs">VAT {r.vatApplies ? `(${r.vatPercent}%)` : ""}</p>
                    <p className="text-lg font-bold">{r.vatApplies ? money(base - r.negotiatedCents) : "—"}</p>
                  </div>
                  <div>
                    <p className="muted text-xs">This buyer pays (first 3 orders)</p>
                    <p className="text-lg font-bold text-wt-green">{money(requesterPays)}</p>
                  </div>
                  <div>
                    <p className="muted text-xs">Other buyers pay</p>
                    <p className="text-lg font-bold">{money(othersPay)}</p>
                  </div>
                </div>

                <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="muted">Publisher contact:</span> {r.publisherName || "—"}</p>
                  <p><span className="muted">Turnaround:</span> {r.tatDays} days</p>
                  <p><span className="muted">Email:</span> {r.publisherEmail || "—"}</p>
                  <p><span className="muted">Phone:</span> {r.publisherPhone || "—"}</p>
                  <p><span className="muted">Pay by:</span> {PAY_LABEL[r.payMethod] || r.payMethod}</p>
                  <p><span className="muted">Pay to:</span> {r.payDetails || "—"}</p>
                  <p><span className="muted">Accepts 72h payment:</span> {r.agreed72h ? "Yes" : "No"}</p>
                  <p><span className="muted">Buyer accepted 5% fee:</span> {r.agreedFee ? "Yes" : "No"}</p>
                </div>

                {r.notes && (
                  <p className="mb-4 rounded-md border border-wt-border bg-white/5 p-3 text-sm text-white/80">{r.notes}</p>
                )}

                {r.status === "pending" ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <form action={approveSiteRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn-primary btn-sm" type="submit">Approve and list</button>
                    </form>
                    <form action={rejectSiteRequestAction} className="flex flex-1 items-end gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <label className="field mb-0 flex-1">
                        <input className="input" name="note" placeholder="Reason for rejection (emailed to the buyer)" />
                      </label>
                      <button className="btn-danger btn-sm" type="submit">Reject</button>
                    </form>
                  </div>
                ) : (
                  <p className="muted text-sm">
                    {r.status === "approved"
                      ? `Listed as listing #${r.listingId}.`
                      : `Rejected${r.adminNote ? `: ${r.adminNote}` : "."}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
