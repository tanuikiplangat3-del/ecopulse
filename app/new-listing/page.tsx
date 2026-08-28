import { requireRole } from "@/lib/auth";
import { NICHES, COUNTRIES, LINK_TYPES } from "@/lib/data";
import { createListingAction } from "@/app/actions/listings";
import { Flash } from "@/components/ui";

export default async function NewListingPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  await requireRole("publisher");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h2 mb-1">Add a site</h1>
      <p className="muted mb-6">List a website you own so buyers can order placements.</p>
      <Flash searchParams={searchParams} />

      <form action={createListingAction} className="card">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field mb-0">
            <span>Domain</span>
            <input className="input" name="domain" placeholder="example.com" required />
          </label>
          <label className="field mb-0">
            <span>Country</span>
            <select className="select" name="country" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </label>
          <label className="field mb-0">
            <span>Your price (USD, what you receive)</span>
            <input className="input" name="price" type="number" min="1" step="1" placeholder="150" required />
          </label>
          <label className="field mb-0">
            <span>Link type</span>
            <select className="select" name="linkType" defaultValue="guest_post">
              {LINK_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </label>
          <label className="field mb-0">
            <span>Domain Rating (DR)</span>
            <input className="input" name="domainRating" type="number" min="0" max="100" placeholder="50" />
          </label>
          <label className="field mb-0">
            <span>Monthly traffic</span>
            <input className="input" name="monthlyTraffic" type="number" min="0" placeholder="10000" />
          </label>
          <label className="field mb-0">
            <span>Turnaround (days)</span>
            <input className="input" name="tatDays" type="number" min="1" defaultValue="7" />
          </label>
        </div>

        <div className="field mt-4">
          <span>Niches</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NICHES.map((n) => (
              <label key={n} className="flex items-center gap-2 text-sm text-white/80">
                <input type="checkbox" name="category" value={n} /> {n}
              </label>
            ))}
          </div>
        </div>

        <label className="field mt-4">
          <span>Description</span>
          <textarea className="textarea" name="description" placeholder="Describe your site, audience, link rules, etc." />
        </label>

        <button className="btn-primary" type="submit">Publish listing</button>
      </form>
    </div>
  );
}
