import { requireRole } from "@/lib/auth";
import { NICHES, COUNTRIES, LANGUAGES, LINK_TYPES } from "@/lib/data";
import { createListingAction } from "@/app/actions/listings";
import { Flash } from "@/components/ui";
import SearchSelect from "@/components/SearchSelect";
import { one } from "@/lib/util";

export const metadata = { title: "Add a website" };

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  await requireRole("publisher");
  const first = one(searchParams.first) === "1";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h2 mb-1">{first ? "Add your first website" : "Add a website"}</h1>
      <p className="muted mb-6">
        List a website you own so buyers can acquire placements. Domain Rating and monthly
        traffic are fetched automatically from Ahrefs.
      </p>
      <Flash searchParams={searchParams} />

      <form action={createListingAction} className="card">
        {first && <input type="hidden" name="first" value="1" />}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field mb-0">
            <span>Website URL</span>
            <input className="input" name="domain" placeholder="example.com" required />
          </label>
          <label className="field mb-0">
            <span>Price (USD, what you receive)</span>
            <input className="input" name="price" type="number" min="1" step="1" placeholder="150" required />
          </label>
          <div className="field mb-0">
            <span>Country</span>
            <SearchSelect name="country" options={COUNTRIES} placeholder="Choose" title="Choose a country" allowAny={false} />
          </div>
          <div className="field mb-0">
            <span>Language</span>
            <SearchSelect name="language" options={LANGUAGES} defaultValue="English" title="Choose a language" allowAny={false} />
          </div>
          <label className="field mb-0">
            <span>Link type</span>
            <select className="select" name="linkType" defaultValue="guest_post">
              {LINK_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </label>
          <label className="field mb-0">
            <span>Turnaround (days)</span>
            <input className="input" name="tatDays" type="number" min="1" defaultValue="7" />
          </label>
        </div>

        <div className="field mt-4">
          <span>Niches (tick all that apply, or leave blank for General)</span>
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
          <textarea className="textarea" name="description" placeholder="Describe your site, audience and link rules." />
        </label>

        <button className="btn-primary" type="submit">Add website</button>
      </form>
    </div>
  );
}
