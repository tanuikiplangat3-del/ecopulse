/**
 * Site authority: DR always, plus DA when the publisher has given one.
 *
 * Why this exists
 * ---------------
 * Ahrefs Domain Rating is fetched automatically for every site we list. But a
 * real site can score badly on DR and well on Moz Domain Authority - the two
 * metrics measure different things - and we are deliberately NOT connected to
 * Moz. So a publisher may add their DA as well, and type the number in
 * themselves.
 *
 * That makes DA a *claim*, not a measurement. Two consequences run through this
 * file and everything that uses it:
 *
 *   1. We still fetch and store the real Ahrefs DR for DA sites, because it
 *      lets an admin spot a site claiming DA 70 that Ahrefs rates DR 2.
 *      (Monthly traffic is no longer part of that call - it is entered by the
 *      publisher. See lib/traffic.ts.)
 *   2. Changing the claim after approval sends the site back to review. A
 *      number nobody can verify must not be editable silently once live.
 *
 * This module is the ONLY place that decides which numbers a site displays.
 * Everything else - marketplace, home page, admin, cards - asks it.
 *
 * Changed 29 Sep 2026 (Cosmas): buyers now see BOTH numbers. DR is always
 * shown; DA is shown next to it when the publisher entered one, and as "-"
 * when they did not (option A). authorityScore, which the "Min authority"
 * filter and the home page use, is the HIGHER of the two, so a site qualifies
 * on either number.
 */

export const AUTHORITY_DR = "dr";
export const AUTHORITY_DA = "da";

export type AuthorityType = typeof AUTHORITY_DR | typeof AUTHORITY_DA;

/** DR and DA are both 0-100 scales. Anything outside this is a bad cell. */
export const AUTHORITY_MIN = 0;
export const AUTHORITY_MAX = 100;

/** The subset of a Listing this module needs. Keeps callers free to pass rows
 *  from any query without widening their select. */
export type AuthorityFields = {
  authorityType?: string | null;
  domainRating?: number | null;
  domainAuthority?: number | null;
};

/** Normalise anything that arrived from a form, a sheet or an old row. */
export function authorityType(raw: string | null | undefined): AuthorityType {
  return String(raw || "").trim().toLowerCase() === AUTHORITY_DA ? AUTHORITY_DA : AUTHORITY_DR;
}

/**
 * The number a site actually displays, and the label it displays it under.
 *
 * A DA site whose DA is missing or zero falls back to DR rather than showing a
 * confident "DA 0" - a blank claim should not make a site look worthless.
 */
export function authorityFor(listing: AuthorityFields): { label: "DR" | "DA"; value: number } {
  const dr = clamp(listing.domainRating);
  const da = clamp(listing.domainAuthority);
  if (authorityType(listing.authorityType) === AUTHORITY_DA && da > 0) {
    return { label: "DA", value: da };
  }
  return { label: "DR", value: dr };
}

/**
 * Both numbers, as buyers see them. `da` is null when the publisher has not
 * given a DA (or gave 0), and the UI shows "-" for it.
 */
export function authorityPair(listing: AuthorityFields): { dr: number; da: number | null } {
  const dr = clamp(listing.domainRating);
  const da = clamp(listing.domainAuthority);
  return { dr, da: authorityType(listing.authorityType) === AUTHORITY_DA && da > 0 ? da : null };
}

/** How a DA reads on screen: the number, or "-" when there is none. */
export function daText(listing: AuthorityFields): string {
  const { da } = authorityPair(listing);
  return da === null ? "-" : String(da);
}

/** The value written to Listing.authorityScore: the higher of DR and DA.
 *  Always derive it from here so the column cannot drift from the rule. */
export function authorityScoreFor(listing: AuthorityFields): number {
  const { dr, da } = authorityPair(listing);
  return Math.max(dr, da ?? 0);
}

/** True when this site displays a publisher-supplied DA rather than Ahrefs DR.
 *  Used by admin views to show the real DR alongside the claim. */
export function isClaimedAuthority(listing: AuthorityFields): boolean {
  return authorityFor(listing).label === "DA";
}

/**
 * Read a DA cell from an uploaded spreadsheet.
 *
 * Publishers put all sorts in these columns - "n/a", "-", "DA 45", "45.7",
 * "" - and a junk cell must never silently become a real-looking score. Returns
 * null for anything that is not a usable 1-100 number, and the caller then
 * leaves the site on DR.
 */
export function parseDaCell(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!text) return null;
  // Pull the first number out of things like "DA 45" or "45/100".
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Math.round(parseFloat(match[0]));
  if (!Number.isFinite(n) || n <= AUTHORITY_MIN || n > AUTHORITY_MAX) return null;
  return n;
}

/** Same rules for a value typed into the add-a-site form. */
export function parseDaInput(raw: unknown): number | null {
  return parseDaCell(raw);
}

function clamp(n: number | null | undefined): number {
  const v = Math.round(Number(n) || 0);
  if (!Number.isFinite(v)) return 0;
  return Math.min(AUTHORITY_MAX, Math.max(AUTHORITY_MIN, v));
}
