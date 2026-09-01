import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Flash, StatusBadge } from "@/components/ui";
import SearchSelect from "@/components/SearchSelect";
import { NICHES, COUNTRIES, LANGUAGES, LINK_TYPES } from "@/lib/data";
import { money } from "@/lib/money";
import { submitSiteRequestAction } from "@/app/actions/site-requests";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request a site" };

export default async function RequestSitePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireRole("buyer");
  const mine = await prisma.siteRequest.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h2 mb-1">Request a site</h1>
      <p className="muted mb-6">
        Negotiated directly with a publisher? Send us the details and we&apos;ll add their site to
        the marketplace. You keep your negotiated price plus a 5% platform service fee &mdash; other
        buyers see our standard pricing.
      </p>
      <Flash searchParams={searchParams} />

      <form action={submitSiteRequestAction} className="card">
        <h2 className="h3 mb-4">The website</h2>
        <label className="field">
          <span>Publisher site name</span>
          <input className="input" name="siteName" placeholder="Kone Media" required />
        </label>
        <label className="field">
          <span>Domain</span>
          <input className="input" name="domain" placeholder="konemedia.co.ke" required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Price you negotiated (USD)</span>
            <input className="input" name="price" type="number" min="1" step="0.01" placeholder="150" required />
          </label>
          <label className="field">
            <span>Turnaround (days)</span>
            <input className="input" name="tatDays" type="number" min="1" max="60" defaultValue="7" required />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <span>Country</span>
            <SearchSelect name="country" options={COUNTRIES} placeholder="Choose" title="Choose a country" allowAny={false} />
          </div>
          <div className="field">
            <span>Language</span>
            <SearchSelect name="language" options={LANGUAGES} defaultValue="English" title="Choose a language" allowAny={false} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <span>Niche</span>
            <SearchSelect name="category" options={NICHES} defaultValue="General" title="Choose a niche" allowAny={false} />
          </div>
          <label className="field">
            <span>Link type</span>
            <select className="select" name="linkType" defaultValue="guest_post">
              {LINK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>

        <h2 className="h3 mb-4 mt-6">Publisher contact</h2>
        <label className="field">
          <span>Contact name</span>
          <input className="input" name="publisherName" placeholder="Jane Doe" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" name="publisherEmail" placeholder="jane@konemedia.co.ke" />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" name="publisherPhone" placeholder="+254 7XX XXX XXX" />
          </label>
        </div>
        <p className="muted -mt-2 mb-4 text-xs">Give us at least one of the two so we can reach them.</p>

        <h2 className="h3 mb-4 mt-6">How the publisher gets paid</h2>
        <label className="field">
          <span>Payment method</span>
          <select className="select" name="payMethod" defaultValue="paypal">
            <option value="paypal">PayPal (preferred)</option>
            <option value="bank">Bank transfer</option>
            <option value="mpesa">M-Pesa</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="field">
          <span>Payment details</span>
          <input className="input" name="payDetails" placeholder="PayPal email, bank account or M-Pesa number" required />
        </label>

        <h2 className="h3 mb-4 mt-6">VAT</h2>
        <label className="field">
          <span>Does the publisher charge VAT?</span>
          <select className="select" name="vatApplies" defaultValue="no">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        <label className="field">
          <span>VAT percentage (only if yes)</span>
          <input className="input" name="vatPercent" type="number" min="0" max="100" step="0.01" placeholder="16" />
          <small className="muted">VAT is added on top of the negotiated price and paid through to the publisher.</small>
        </label>

        <h2 className="h3 mb-4 mt-6">Terms</h2>
        <label className="mb-3 flex items-start gap-3 rounded-md border border-wt-border bg-white/5 p-3 text-sm">
          <input type="checkbox" name="agreed72h" className="mt-1" required />
          <span>
            I confirm the publisher has agreed to be paid <strong>within 72 hours</strong> of the buyer
            confirming the link is live. We cannot list a publisher who does not accept this.
          </span>
        </label>
        <label className="mb-4 flex items-start gap-3 rounded-md border border-wt-border bg-white/5 p-3 text-sm">
          <input type="checkbox" name="agreedFee" className="mt-1" required />
          <span>
            I agree to a <strong>5% platform service fee</strong> on top of my negotiated price for
            orders I place on this site.
          </span>
        </label>

        <label className="field">
          <span>Anything else we should know? (optional)</span>
          <textarea className="textarea" name="notes" placeholder="Link rules, content requirements, who introduced you..." />
        </label>

        <button className="btn-primary w-full" type="submit">Submit for review</button>
        <p className="muted mt-3 text-center text-xs">
          Our team reviews every request. You&apos;ll be emailed once it is approved or if we cannot list it.
        </p>
      </form>

      {mine.length > 0 && (
        <div className="card mt-6 overflow-x-auto">
          <h2 className="h3 mb-3">Your requests</h2>
          <table className="table-wt">
            <thead><tr><th>Website</th><th>Your price</th><th>VAT</th><th>Status</th><th>Sent</th></tr></thead>
            <tbody>
              {mine.map((r: any) => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.domain}<div className="muted text-xs">{r.siteName}</div></td>
                  <td>{money(r.negotiatedCents)}</td>
                  <td className="muted">{r.vatApplies ? `${r.vatPercent}%` : "—"}</td>
                  <td>
                    <StatusBadge status={r.status} />
                    {r.status === "rejected" && r.adminNote && (
                      <div className="muted mt-1 text-xs">{r.adminNote}</div>
                    )}
                  </td>
                  <td className="muted">{r.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
