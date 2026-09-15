import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Flash, StatusBadge } from "@/components/ui";
import { money, buyerPrice, listingBaseCents, MARKUP_INVITED, MARKUP_REQUESTED } from "@/lib/money";
import { approveSiteRequestAction, rejectSiteRequestAction, createPublisherLinkAction } from "@/app/actions/site-requests";
import { appUrl } from "@/lib/stripe";

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
  const base = appUrl();

  return (
    <div>
      <h1 className="h2 mb-1">Site requests</h1>
      <p className="muted mb-6">
        Publishers that buyers negotiated themselves. Generate a sign-up link and the buyer
        forwards it to their publisher, who then lists the site on their own account and is
        paid like any other publisher.
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
            // Priced as an invited-publisher listing, which is what the link
            // produces: the tiered margin for everyone, the flat brought-in
            // commission for this buyer. The publisher sets their own price
            // when they list, so this is an estimate from the price the buyer
            // told us they negotiated.
            const requesterPays = buyerPrice(r.negotiatedCents, MARKUP_INVITED, {
              vatPercent: r.vatPercent,
              requesterRate: true,
            });
            const othersPay = buyerPrice(r.negotiatedCents, MARKUP_INVITED, { vatPercent: r.vatPercent });
            // "List it myself instead" produces a MARKUP_REQUESTED listing.
            // Both models price identically now, so these two normally match -
            // the comparison is kept so that if they ever diverge again the
            // fallback price is on screen before an admin promises one.
            const fbRequester = buyerPrice(r.negotiatedCents, MARKUP_REQUESTED, {
              vatPercent: r.vatPercent,
              requesterRate: true,
            });
            const fbOthers = buyerPrice(r.negotiatedCents, MARKUP_REQUESTED, { vatPercent: r.vatPercent });
            const fallbackDiffers = fbRequester !== requesterPays || fbOthers !== othersPay;
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
                      Requested by {buyer?.name || "unknown"} ({buyer?.email || "-"}) on{" "}
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
                    <p className="text-lg font-bold">{r.vatApplies ? money(base - r.negotiatedCents) : "-"}</p>
                  </div>
                  <div>
                    <p className="muted text-xs">This buyer pays</p>
                    <p className="text-lg font-bold text-wt-green">{money(requesterPays)}</p>
                  </div>
                  <div>
                    <p className="muted text-xs">Other buyers pay</p>
                    <p className="text-lg font-bold">{money(othersPay)}</p>
                  </div>
                </div>

                {fallbackDiffers && (
                  <p className="muted mb-4 text-xs">
                    Those are the prices if the publisher signs up through the link. If you
                    list it yourself instead, we pay that publisher by hand and the $25
                    minimum applies, so this buyer would pay{" "}
                    <strong className="text-white">{money(fbRequester)}</strong> and other
                    buyers <strong className="text-white">{money(fbOthers)}</strong>.
                  </p>
                )}

                <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="muted">Publisher contact:</span> {r.publisherName || "-"}</p>
                  <p><span className="muted">Turnaround:</span> {r.tatDays} days</p>
                  <p><span className="muted">Email:</span> {r.publisherEmail || "-"}</p>
                  <p><span className="muted">Phone:</span> {r.publisherPhone || "-"}</p>
                  <p><span className="muted">Pay by:</span> {PAY_LABEL[r.payMethod] || r.payMethod}</p>
                  <p><span className="muted">Pay to:</span> {r.payDetails || "-"}</p>
                  <p><span className="muted">Accepts 72h payment:</span> {r.agreed72h ? "Yes" : "No"}</p>
                  <p><span className="muted">Buyer accepted 5% fee:</span> {r.agreedFee ? "Yes" : "No"}</p>
                </div>

                {r.notes && (
                  <p className="mb-4 rounded-md border border-wt-border bg-white/5 p-3 text-sm text-white/80">{r.notes}</p>
                )}

                {r.status === "invited" && r.inviteToken && (
                  <div className="mb-4 rounded-md border border-wt-green/40 bg-wt-green/10 p-3">
                    <p className="text-sm font-semibold">Publisher sign-up link (sent to {buyer?.email || "the buyer"})</p>
                    <p className="mt-1 break-all font-mono text-xs text-white/80">
                      {base}/accept-invite?token={r.inviteToken}
                    </p>
                    <p className="muted mt-2 text-xs">
                      Works once, expires 30 days after it was created. Generating a new link
                      cancels this one.
                    </p>
                  </div>
                )}

                {["pending", "invited"].includes(r.status) ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <form action={createPublisherLinkAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn-primary btn-sm" type="submit">
                        {r.status === "invited" ? "Generate a new link" : "Generate publisher link"}
                      </button>
                    </form>
                    <form action={approveSiteRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn-ghost btn-sm" type="submit">List it myself instead</button>
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
                      ? r.listingId
                        ? `Listed as listing #${r.listingId}.`
                        : "The publisher signed up through the link and can now list their sites."
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
