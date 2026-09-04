// Shared layout for the legal pages (Terms of Service, Refund Policy).
//
// Follows the format of welcometomorrow.io/legal-notice/ - a plain title, no
// hero, numbered sections and a generous reading measure - but rendered in the
// tool's own dark theme with white type, so it sits with the rest of Link
// Tomorrow rather than looking like a pasted document.

import Link from "next/link";

export function LegalShell({
  title,
  meta,
  children,
  footnote,
}: {
  title: string;
  meta: string;
  children: React.ReactNode;
  /** Small print at the very bottom - registered address, contact address. */
  footnote?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-measure py-4">
      <Link href="/" className="muted text-sm transition-colors hover:text-white">
        ← Back to Link Tomorrow
      </Link>

      <h1 className="h2 mb-3 mt-4 text-white">{title}</h1>
      <p className="mb-12 text-[16px] leading-[1.5] text-white/70">{meta}</p>

      <div className="space-y-11">{children}</div>

      {footnote && (
        <div className="mt-16 border-t border-white/10 pt-6 text-[16px] leading-[1.5] text-white/70">
          {footnote}
        </div>
      )}
    </div>
  );
}

/** A numbered top-level section, e.g. "1. Platform Role & Intermediary Agent Status". */
export function LegalSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="h3 mb-5 text-white">
        <span className="text-wt-green">{n}.</span> {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** Body paragraph. `lead` marks a defined term or clause number in bold. */
export function LegalP({ lead, children }: { lead?: string; children?: React.ReactNode }) {
  return (
    <p className="text-[16px] leading-[1.75] text-white">
      {lead && <strong className="font-bold">{lead}</strong>}
      {lead && " "}
      {children}
    </p>
  );
}

/** Bulleted list. Items may be plain text or <LegalItem>. */
export function LegalList({ children, ordered = false }: { children: React.ReactNode; ordered?: boolean }) {
  const cls = "ml-5 space-y-3 text-[16px] leading-[1.75] text-white marker:text-wt-green";
  return ordered ? (
    <ol className={`list-decimal ${cls}`}>{children}</ol>
  ) : (
    <ul className={`list-disc ${cls}`}>{children}</ul>
  );
}

/** One list item, optionally led by a bold term. */
export function LegalItem({ term, children }: { term?: string; children: React.ReactNode }) {
  return (
    <li className="pl-1">
      {term && <strong className="font-bold">{term}</strong>}
      {term && " "}
      {children}
    </li>
  );
}

/** A highlighted clause that must not be missed (e.g. deposits are final). */
export function LegalCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-wt-yellow/40 bg-wt-yellow/5 p-5 text-[16px] leading-[1.75] text-white">
      {children}
    </div>
  );
}
