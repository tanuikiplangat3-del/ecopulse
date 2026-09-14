// Monthly organic traffic - publisher-entered, single source of truth for parsing.
//
// We used to read this from the Ahrefs /site-explorer/metrics endpoint. It is
// typed in by hand now: on the single-site form, in the sheet's "traffic"
// column, and editable afterwards on My Websites. Nothing fetches it.
//
// Spreadsheets write the same number a dozen ways - "12,000", "12k", "1.2M",
// "~5 000", "12000 visits" - so every entry point parses through here rather
// than each caller inventing its own rules.

/** Highest value we will accept. Above this it is a typo, not a website. */
export const MAX_TRAFFIC = 2_000_000_000;

function parse(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (["n/a", "na", "none", "-", "unknown", "?"].includes(s)) return null;

  // Drop thousands separators, spaces and anything that is not part of a
  // number or a k/m suffix ("~5 000 visits/mo" -> "5000").
  s = s.replace(/[,\s_]/g, "");
  const m = s.match(/^[~≈>+]?([0-9]*\.?[0-9]+)([km])?/);
  if (!m) return null;

  let n = parseFloat(m[1]);
  if (!isFinite(n) || n < 0) return null;
  if (m[2] === "k") n *= 1_000;
  if (m[2] === "m") n *= 1_000_000;

  n = Math.round(n);
  if (n < 0) return null;
  if (n > MAX_TRAFFIC) return null;
  return n;
}

/**
 * A typed value from a form field. Returns null when the publisher left it
 * blank or typed something we cannot read, so the caller can refuse the form
 * rather than silently publishing a site with 0 traffic.
 */
export function parseTrafficInput(raw: FormDataEntryValue | null | string): number | null {
  return parse(raw);
}

/**
 * A cell from an uploaded spreadsheet. Same rules; null means "this row did not
 * give us a usable number", which the upload reports back rather than guessing.
 */
export function parseTrafficCell(raw: string): number | null {
  return parse(raw);
}
