// Ahrefs API v3 - fetch Domain Rating and monthly organic traffic for a domain.
// Docs verified: /site-explorer/domain-rating and /site-explorer/metrics.
// Response shapes (confirmed against the live API):
//   domain-rating -> { "domain_rating": { "domain_rating": 91.0, "ahrefs_rank": 619 } }
//   metrics       -> { "metrics": { "org_traffic": 6238149, ... } }

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
 * never overwrites good numbers with zeros.
 */
export async function fetchDomainMetrics(
  input: string
): Promise<{ dr: number; traffic: number; ok: boolean }> {
  const key = process.env.AHREFS_API_KEY || "";
  const target = cleanDomain(input);
  if (!key) {
    console.error("[ahrefs] AHREFS_API_KEY is not set - DR and traffic will stay 0.");
    return { dr: 0, traffic: 0, ok: false };
  }
  if (!target) return { dr: 0, traffic: 0, ok: false };

  const date = new Date().toISOString().slice(0, 10);
  const base = "https://api.ahrefs.com/v3/site-explorer";
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };

  let dr = 0;
  let traffic = 0;
  let ok = false;
  try {
    // Ahrefs' metrics endpoint is regularly slower than 6s on a cold target.
    const signal = AbortSignal.timeout(15000);
    const [drRes, mRes] = await Promise.all([
      fetch(`${base}/domain-rating?target=${encodeURIComponent(target)}&date=${date}&output=json`, {
        headers,
        cache: "no-store",
        signal,
      }),
      fetch(
        `${base}/metrics?target=${encodeURIComponent(target)}&date=${date}&mode=subdomains&output=json`,
        { headers, cache: "no-store", signal }
      ),
    ]);
    if (drRes.ok) {
      const j: any = await drRes.json();
      dr = Math.round(Number(j?.domain_rating?.domain_rating ?? 0));
      ok = true;
    } else {
      console.error(
        `[ahrefs] domain-rating ${drRes.status} for ${target}: ${(await drRes.text()).slice(0, 300)}`
      );
    }
    if (mRes.ok) {
      const j: any = await mRes.json();
      traffic = Math.round(Number(j?.metrics?.org_traffic ?? 0));
      ok = true;
    } else {
      console.error(
        `[ahrefs] metrics ${mRes.status} for ${target}: ${(await mRes.text()).slice(0, 300)}`
      );
    }
  } catch (e: any) {
    // Fail soft - a listing can still be created without live metrics.
    console.error(`[ahrefs] request failed for ${target}: ${e?.name || ""} ${e?.message || e}`);
  }
  return { dr: isNaN(dr) ? 0 : dr, traffic: isNaN(traffic) ? 0 : traffic, ok };
}
