import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { bulkUploadAction } from "@/app/actions/listings";
import { Flash } from "@/components/ui";
import { one } from "@/lib/util";

export const metadata = { title: "Upload websites" };

export default async function BulkUploadPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  await requireRole("publisher");
  const first = one(searchParams.first) === "1";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h2 mb-1">Upload your websites</h1>
      <p className="muted mb-6">
        Upload a CSV or Excel file and each row becomes a website, exactly as if you added
        it one by one. You can upload up to 1,000 websites in a single file. Domain Rating
        and monthly traffic are pulled from Ahrefs and appear shortly after the upload.
      </p>
      <Flash searchParams={searchParams} />

      <div className="card mb-5">
        <h2 className="h3 mb-2">Your spreadsheet columns</h2>
        <p className="muted mb-3 text-sm">Include a header row with these columns (in any order):</p>
        <div className="overflow-x-auto">
          <table className="table-wt">
            <thead>
              <tr><th>site name</th><th>url</th><th>price</th><th>country</th><th>language</th><th>niche</th><th>da</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Kone Media</td><td>konemedia.co.ke</td><td>150</td><td>Kenya</td><td>English</td><td>Business, Finance</td><td>45</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted mt-3 text-xs">
          For multiple niches on one site, separate them with commas, or write General.
        </p>
        <p className="muted mt-2 text-xs">
          <strong className="text-white">The da column is optional.</strong> Leave it blank and
          we fill in the site&rsquo;s Domain Rating from Ahrefs automatically. Put a number
          from 1 to 100 in it and that site shows your Domain Authority instead of DR &mdash;
          use it for sites that score better on DA. Anything we cannot read as a number is
          ignored and the site stays on DR.
        </p>
      </div>

      <form action={bulkUploadAction} className="card">
        {first && <input type="hidden" name="first" value="1" />}
        <label className="field">
          <span>Choose your file (.csv or .xlsx)</span>
          <input className="input" type="file" name="file" accept=".csv,.xlsx,.xls" required />
        </label>
        <button className="btn-primary" type="submit">Upload websites</button>
      </form>

      <p className="muted mt-4 text-sm">
        Prefer to add one at a time? <Link href={`/new-listing${first ? "?first=1" : ""}`} className="text-wt-green">Add a single website</Link>
      </p>
    </div>
  );
}
