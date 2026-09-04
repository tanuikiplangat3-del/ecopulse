"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { centsFromUsd, money, MARKUP_TIERED } from "@/lib/money";
import { checkDuplicate, liveDomains, STATUS_CONFLICT } from "@/lib/duplicates";
import { normalizeCountry } from "@/lib/data";
import { fetchDomainMetrics } from "@/lib/ahrefs";

const q = (s: string) => encodeURIComponent(s);
const autoApprove = () => (process.env.AUTO_APPROVE_LISTINGS || "true") === "true";

async function makeListing(publisherId: number, data: {
  domain: string; url?: string; category: string; country: string;
  language?: string; priceCents: number; linkType?: string; tatDays?: number; description?: string;
}, opts: { skipAhrefs?: boolean; status?: string } = {}) {
  const domain = data.domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const url = (data.url || `https://${domain}`).trim();
  // Auto-fetch DR + monthly traffic from Ahrefs (fails soft to 0).
  const metrics = opts.skipAhrefs ? { dr: 0, traffic: 0, ok: false } : await fetchDomainMetrics(domain);
  const dr = metrics.dr;
  const traffic = metrics.traffic;
  return prisma.listing.create({
    data: {
      publisherId,
      domain,
      url,
      category: data.category,
      country: data.country,
      language: data.language || "English",
      domainRating: dr,
      monthlyTraffic: traffic,
      markupModel: MARKUP_TIERED, // new sites use tiered pricing; older ones keep +$30
      // Only mark as fetched when Ahrefs actually answered, so the weekly
      // refresh picks it up straight away if it did not.
      metricsUpdatedAt: metrics.ok ? new Date() : null,
      linkType: data.linkType || "guest_post",
      priceCents: data.priceCents,
      tatDays: data.tatDays || 7,
      description: data.description || "",
      status: opts.status || (autoApprove() ? "approved" : "pending"),
    },
  });
}

export async function createListingAction(formData: FormData) {
  const user = await requireRole("publisher");
  const domain = String(formData.get("domain") || "").trim();
  const niches = formData.getAll("category").map(String).filter(Boolean);
  const country = String(formData.get("country") || "").trim();
  const language = String(formData.get("language") || "English").trim();
  const priceUsd = parseFloat(String(formData.get("price") || "0"));
  const linkType = String(formData.get("linkType") || "guest_post");
  const tatDays = parseInt(String(formData.get("tatDays") || "7")) || 7;
  const description = String(formData.get("description") || "").trim();
  const first = String(formData.get("first") || "") === "1";

  if (!domain) redirect(`/new-listing?error=${q("Please enter your website domain.")}${first ? "&first=1" : ""}`);
  if (!country) redirect(`/new-listing?error=${q("Please choose a country.")}${first ? "&first=1" : ""}`);
  if (!priceUsd || priceUsd <= 0) redirect(`/new-listing?error=${q("Enter a valid price in USD.")}${first ? "&first=1" : ""}`);

  const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
  const dupe = await checkDuplicate(cleanDomain);

  await makeListing(user.id, {
    domain,
    category: niches.length ? niches.join(",") : "General",
    // The picker already sends a canonical name; this only guards against a
    // stale form or an older browser sending something slightly different.
    country: normalizeCountry(country) || country,
    language,
    priceCents: centsFromUsd(priceUsd),
    linkType,
    tatDays,
    description,
  }, {
    // Already on the marketplace? Hold it for review rather than publishing it
    // or quietly taking anyone down. An admin compares the two prices and
    // decides, on Admin -> Conflicts.
    status: dupe.exists ? STATUS_CONFLICT : undefined,
  });

  revalidatePath("/my-listings");
  revalidatePath("/marketplace");
  const note = dupe.exists
    ? `${cleanDomain} is already on the marketplace at ${money(dupe.cheapestCents || 0)}. Your listing has been sent to our team to review - we will let you know which price we go with.`
    : "Website added.";
  redirect(first ? `/payout?first=1` : `/my-listings?success=${q(note)}`);
}

/** Parse an uploaded spreadsheet (CSV or XLSX) and create one listing per row. */
export async function bulkUploadAction(formData: FormData) {
  const user = await requireRole("publisher");
  const first = String(formData.get("first") || "") === "1";
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) redirect(`/bulk-upload?error=${q("Please choose a spreadsheet to upload.")}${first ? "&first=1" : ""}`);

  let rows: Record<string, any>[] = [];
  try {
    const buf = Buffer.from(await file!.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } catch {
    redirect(`/bulk-upload?error=${q("Could not read that file. Use the CSV or Excel template.")}${first ? "&first=1" : ""}`);
  }

  const get = (row: Record<string, any>, keys: string[]) => {
    const lower: Record<string, any> = {};
    for (const k of Object.keys(row)) lower[k.toLowerCase().trim()] = row[k];
    for (const k of keys) if (lower[k] !== undefined && String(lower[k]).trim() !== "") return String(lower[k]).trim();
    return "";
  };

  // Build every row first, then insert them in one go. No Ahrefs calls happen here:
  // 1000 live lookups could never finish inside a single request. DR and monthly
  // traffic are filled in afterwards by "Refresh DR & traffic" on the admin
  // Listings page, which works through them in batches.
  const MAX_ROWS = 1000;
  const approved = autoApprove() ? "approved" : "pending";
  const toProcess = rows.slice(0, MAX_ROWS);
  const data: any[] = [];
  let skipped = 0;
  // Country cells that we could not match to a real country, and how many rows
  // used each one. Reported back so the sheet can be corrected, rather than
  // quietly filing those sites under a country nobody will find them in.
  const unmatchedCountries = new Map<string, number>();
  let missingCountry = 0;

  for (const row of toProcess) {
    const raw = get(row, ["url", "site url", "website", "domain", "site name", "site"]);
    const priceStr = get(row, ["price", "price usd", "cost"]);
    // Sheets write countries every which way ("dr congo", "DRC", "Ivory Coast"),
    // so map the cell onto the exact name the marketplace filter uses.
    const rawCountry = get(row, ["country", "country name", "geo", "location", "market"]);
    const matched = normalizeCountry(rawCountry);
    if (!rawCountry) missingCountry++;
    else if (!matched) unmatchedCountries.set(rawCountry, (unmatchedCountries.get(rawCountry) || 0) + 1);
    // Blank cell -> Kenya, as before. An unrecognised name is kept as written so
    // an admin can see exactly what the sheet said and fix it.
    const country = matched || rawCountry || "Kenya";
    const language = get(row, ["language", "lang"]) || "English";
    const niche = get(row, ["niche", "niches", "category", "categories"]) || "General";
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
    if (!raw || !price || price <= 0) {
      skipped++;
      continue;
    }
    const domain = raw.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
    if (!domain) {
      skipped++;
      continue;
    }
    data.push({
      publisherId: user.id,
      domain,
      url: `https://${domain}`,
      category: niche.replace(/;/g, ","),
      country,
      language,
      domainRating: 0,
      monthlyTraffic: 0,
      markupModel: MARKUP_TIERED,
      linkType: "guest_post",
      priceCents: centsFromUsd(price),
      tatDays: 7,
      description: "",
      status: approved,
    });
  }

  if (data.length === 0) {
    redirect(`/bulk-upload?error=${q("No usable rows found. Each row needs a website and a price above 0.")}${first ? "&first=1" : ""}`);
  }

  // Any row whose domain is already on the marketplace is held for review rather
  // than published. One query for the whole sheet, not one per row. A domain
  // repeated inside the same sheet is also held from the second occurrence on,
  // so an upload cannot quietly list the same site twice.
  const alreadyLive = await liveDomains(Array.from(new Set(data.map((r) => r.domain as string))));
  const seenInSheet = new Set<string>();
  let conflicts = 0;
  for (const row of data) {
    const d = row.domain as string;
    if (alreadyLive.has(d) || seenInSheet.has(d)) {
      row.status = STATUS_CONFLICT;
      conflicts++;
    }
    seenInSheet.add(d);
  }

  // Insert in chunks so a very large sheet never builds one oversized statement.
  let created = 0;
  for (let i = 0; i < data.length; i += 250) {
    const res = await prisma.listing.createMany({ data: data.slice(i, i + 250) });
    created += res.count;
  }

  revalidatePath("/my-listings");
  revalidatePath("/marketplace");
  // Name the unrecognised countries (worst offenders first) so the sheet can be
  // fixed; the sites are still listed, they just will not show under a country.
  const badCountries = Array.from(unmatchedCountries.entries()).sort((a, b) => b[1] - a[1]);
  const countryNote = badCountries.length
    ? ` ${badCountries.reduce((n, [, c]) => n + c, 0)} row(s) had a country we could not recognise: ` +
      badCountries.slice(0, 8).map(([name, c]) => `"${name}" (${c})`).join(", ") +
      (badCountries.length > 8 ? ` and ${badCountries.length - 8} more` : "") +
      ". Those sites are listed but will not show under a country until the name is corrected."
    : "";

  const note =
    `${created} website(s) uploaded.` +
    (conflicts
      ? ` ${conflicts} were already on the marketplace and are being reviewed by our team - we will confirm which price we go with.`
      : "") +
    (skipped ? ` ${skipped} row(s) were skipped (missing website or price).` : "") +
    countryNote +
    (missingCountry ? ` ${missingCountry} row(s) had no country column filled in and were set to Kenya.` : "") +
    (rows.length > MAX_ROWS ? ` Only the first ${MAX_ROWS} rows were read.` : "") +
    " Domain Rating and traffic are added shortly.";
  redirect(first ? `/payout?first=1` : `/my-listings?success=${q(note)}`);
}

export async function deleteListingAction(formData: FormData) {
  const user = await requireRole("publisher");
  const id = parseInt(String(formData.get("id") || "0"));
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (listing && listing.publisherId === user.id) {
    await prisma.listing.delete({ where: { id } });
  }
  revalidatePath("/my-listings");
  redirect(`/my-listings?success=${q("Website removed.")}`);
}

export async function savePayoutAction(formData: FormData) {
  const user = await requireRole("publisher");
  const first = String(formData.get("first") || "") === "1";
  await prisma.user.update({
    where: { id: user.id },
    data: {
      payMethod: String(formData.get("payMethod") || "").trim() || null,
      payCountry: String(formData.get("payCountry") || "").trim() || null,
      payBank: String(formData.get("payBank") || "").trim() || null,
      payPaypal: String(formData.get("payPaypal") || "").trim() || null,
      payMpesa: String(formData.get("payMpesa") || "").trim() || null,
      payCard: String(formData.get("payCard") || "").trim() || null,
    },
  });
  redirect(first ? `/dashboard?success=${q("You're all set. Welcome aboard!")}` : `/payout?success=${q("Payment details saved.")}`);
}
