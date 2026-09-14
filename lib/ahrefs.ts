// Ahrefs API v3 - fetch Domain Rating for a domain.
// Docs verified: /site-explorer/domain-rating.
// Response shape (confirmed against the live API):
//   domain-rating -> { "domain_rating": { "domain_rating": 91.0, "ahrefs_rank": 619 } }
//
// TRAFFIC IS NOT FETCHED HERE ANY MORE. Monthly traffic is typed in by the
// publisher when they add a site or upload a sheet, and edited on My Websites.
// The /site-explorer/metrics call that used to supply org_traffic has been
// removed deliberately - do not put it back without asking.

export const ahrefsEnabled = (): boolean => !!process.env.AHREFS_API_KEY;

function cleanDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "");
}

/**
 * `ok` is true only when Ahrefs actually answered for this domain. It lets callers
 * tell a real zero apart from a missing key / auth error / timeout, so a refresh
 * never overwrites a good DR with a zero.
 */
export async function fetchDomainRating(
  input: string
): Promise<{ dr: number; ok: boolean }> {
  const key = process.env.AHREFS_API_KEY || "";
  const target = cleanDomain(input);
  if (!key) {
    console.error("[ahrefs] AHREFS_API_KEY is not set - DR will stay 0.");
    return { dr: 0, ok: false };
  }
  if (!target) return { dr: 0, ok: false };

  const date = new Date().toISOString().slice(0, 10);
  const base = "https://api.ahrefs.com/v3/site-explorer";
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };

  let dr = 0;
  let ok = false;
  try {
    const signal = AbortSignal.timeout(15000);
    const res = await fetch(
      `${base}/domain-rating?target=${encodeURIComponent(target)}&date=${date}&output=json`,
      { headers, cache: "no-store", signal }
    );
    if (res.ok) {
      const j: any = await res.json();
      dr = Math.round(Number(j?.domain_rating?.domain_rating ?? 0));
      ok = true;
    } else {
      console.error(
        `[ahrefs] domain-rating ${res.status} for ${target}: ${(await res.text()).slice(0, 300)}`
      );
    }
  } catch (e: any) {
    // Fail soft - a listing can still be created without a live DR.
    console.error(`[ahrefs] request failed for ${target}: ${e?.name || ""} ${e?.message || e}`);
  }
  return { dr: isNaN(dr) ? 0 : dr, ok };
}
