import type { Metadata } from "next";
import { submitApplicationAction } from "@/app/actions/apply";
import { Flash } from "@/components/ui";

export const metadata: Metadata = {
  title: "Request to Be a Publisher",
  description:
    "Own a website with strong authority and steady traffic? Request to be listed on the Welcome Tomorrow link building marketplace. Every site is reviewed before it goes live.",
  alternates: { canonical: "https://tools.welcometomorrow.io/ecopulse/apply" },
  openGraph: {
    title: "Request to Be a Publisher | Welcome Tomorrow",
    description:
      "Apply to list your website on the Welcome Tomorrow link building marketplace. Every site is reviewed before it goes live.",
    url: "https://tools.welcometomorrow.io/ecopulse/apply",
  },
};

export default function ApplyPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="mx-auto max-w-xl">
      <span className="badge badge-green mb-4 inline-block">For publishers</span>
      <h1 className="h2 mb-2">Request to be a publisher</h1>
      <p className="muted mb-6">
        Are you a reputable publisher with good authority and constant traffic? Request to be
        listed. Our team reviews every website before it goes live on the marketplace.
      </p>

      <Flash searchParams={searchParams} />

      <form action={submitApplicationAction} className="card">
        <label className="field">
          <span>Your name</span>
          <input className="input" name="name" placeholder="Jane Doe" required />
        </label>
        <label className="field">
          <span>Your email</span>
          <input className="input" type="email" name="email" placeholder="you@company.com" required />
        </label>
        <label className="field">
          <span>Website URLs for review</span>
          <textarea
            className="textarea"
            name="urls"
            placeholder="One website per line, e.g.&#10;https://mysite.com&#10;https://anothersite.co.ke"
            required
          />
          <small className="muted">List each website you want reviewed, one per line.</small>
        </label>
        <label className="field">
          <span>Anything else? (optional)</span>
          <textarea className="textarea" name="note" placeholder="Traffic, niches, pricing expectations..." />
        </label>
        <button className="btn-primary w-full" type="submit">Submit request</button>
      </form>
    </div>
  );
}
