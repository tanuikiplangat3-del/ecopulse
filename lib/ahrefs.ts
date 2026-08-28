// Ahrefs API v3 - fetch Domain Rating and monthly organic traffic for a domain.
// Docs verified: /site-explorer/domain-rating and /site-explorer/metrics.

export const ahrefsEnabled = (): boolean => !!process.env.AHREFS_API_KEY;

function cleanDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "");
}

export async function fetchDomainMetrics(
  input: string
): Promise<{ dr: number; traffic: number }> {
  const key = process.env.AHREFS_API_KEY || "";
  const target = cleanDomain(input);
  if (!key || !target) return { dr: 0, traffic: 0 };

  const date = new Date().toISOString().slice(0, 10);
  const base = "https://api.ahrefs.com/v3/site-explorer";
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };

  let dr = 0;
  let traffic = 0;
  try {
    const signal = AbortSignal.timeout(6000);
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
    }
    if (mRes.ok) {
      const j: any = await mRes.json();
      traffic = Math.round(Number(j?.metrics?.org_traffic ?? 0));
    }
  } catch {
    // Fail soft - a listing can still be created without live metrics.
  }
  return { dr: isNaN(dr) ? 0 : dr, traffic: isNaN(traffic) ? 0 : traffic };
}
