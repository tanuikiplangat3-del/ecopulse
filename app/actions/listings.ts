"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { centsFromUsd, money, MARKUP_TIERED } from "@/lib/money";
import { checkDuplicate, liveDomains, STATUS_CONFLICT } from "@/lib/duplicates";
import { normalizeCountry } from "@/lib/data";
import { fetchDomainRating } from "@/lib/ahrefs";
import { parseTrafficCell, parseTrafficInput } from "@/lib/traffic";
import {
  AUTHORITY_DA,
  authorityScoreFor,
  authorityType as authorityTypeOf,
  parseDaCell,
  parseDaInput,
} from "@/lib/authority";

const q = (s: string) => encodeURIComponent(s);
const autoApprove = () => (process.env.AUTO_APPROVE_LISTINGS || "true") === "true";

async function makeListing(publisherId: number, data: {
  domain: string; url?: string; category: string; country: string;
  language?: string; priceCents: number; linkType?: string; tatDays?: number; description?: string;
  // Monthly traffic is typed in by the publisher - nothing fetches it.
  monthlyTraffic?: number;
  // Which authority number this site displays. Omitted means DR, which is what
  // every site created before this feature used.
  authorityType?: string; domainAuthority?: number;
}, opts: { skipAhrefs?: boolean; status?: string } = {}) {
  const domain = data.domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const url = (data.url || `https://${domain}`).trim();
  // Auto-fetch DR from Ahrefs (fails soft to 0). This runs even when the site
  // will display DA, because admins compare the claim against the real DR when
  // approving. Traffic is NOT fetched - it comes from the form.
  const metrics = opts.skipAhrefs ? { dr: 0, ok: false } : await fetchDomainRating(domain);
  const dr = metrics.dr;
  const traffic = Math.max(0, Math.round(data.monthlyTraffic || 0));
  const authority = {
    authorityType: authorityTypeOf(data.authorityType),
    domainRating: dr,
    domainAuthority: data.domainAuthority || 0,
  };
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
      authorityType: authority.authorityType,
      domainAuthority: authority.domainAuthority,
      authorityScore: authorityScoreFor(authority),
      markupModel: MARKUP_TIERED, // new sites use tiered pricing; older ones keep +$30
      // Only mark DR as fetched when Ahrefs actually answered, so the weekly
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
  // Monthly traffic is entered by hand now. Blank or unreadable is refused
  // rather than quietly stored as 0 - a site showing 0 traffic looks broken to
  // buyers and there is no Ahrefs call coming along later to fix it.
  const traffic = parseTrafficInput(formData.get("monthlyTraffic"));
  const first = String(formData.get("first") || "") === "1";
  // DR or DA. On DR we type nothing - Ahrefs fills it in below. On DA the
  // publisher supplies the number themselves, because we are not connected to
  // Moz and cannot look it up.
  const chosenAuthority = authorityTypeOf(String(formData.get("authorityType") || ""));
  const daValue = parseDaInput(formData.get("domainAuthority"));

  if (!domain) redirect(`/new-listing?error=${q("Please enter your website domain.")}${first ? "&first=1" : ""}`);
  if (!country) redirect(`/new-listing?error=${q("Please choose a country.")}${first ? "&first=1" : ""}`);
  if (!priceUsd || priceUsd <= 0) redirect(`/new-listing?error=${q("Enter a valid price in USD.")}${first ? "&first=1" : ""}`);
  if (traffic === null) {
    redirect(`/new-listing?error=${q("Enter your monthly organic traffic as a number, for example 12000. Enter 0 if the site is brand new.")}${first ? "&first=1" : ""}`);
  }
  // Choosing DA and then leaving the box blank would silently publish the site
  // on its Ahrefs DR - the opposite of what the publisher asked for. Stop.
  if (chosenAuthority === AUTHORITY_DA && daValue === null) {
    redirect(`/new-listing?error=${q("Enter your Domain Authority as a number between 1 and 100, or choose Domain Rating instead.")}${first ? "&first=1" : ""}`);
  }

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
    monthlyTraffic: traffic!,
    authorityType: chosenAuthority,
    domainAuthority: daValue || 0,
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
  // 1000 live lookups could never finish inside a single request. DR is filled in
  // afterwards by "Refresh DR" on the admin Listings page, which works through
  // them in batches. Monthly traffic comes from the sheet's own traffic column -
  // nothing fetches it later, so a row without one is reported back.
  const MAX_ROWS = 1000;
  const approved = autoApprove() ? "approved" : "pending";
  const toProcess = rows.slice(0, MAX_ROWS);
  const data: any[] = [];
  let skipped = 0;
  // How many rows carried a usable DA, so the confirmation can say so.
  let daRows = 0;
  // Rows with no readable traffic figure. They are still listed (at 0) but the
  // publisher is told how many, because no later job will fill them in.
  let missingTraffic = 0;
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
    // Optional DA column. A usable number here means this site displays DA
    // instead of the Ahrefs DR; blank, "n/a" or anything out of the 1-100 range
    // leaves the site on DR. Junk must never become a real-looking score, so
    // parseDaCell decides, not this loop.
    const da = parseDaCell(get(row, ["da", "domain authority", "domainauthority", "moz da", "moz"]));
    // Monthly traffic, typed in by the publisher. "12,000", "12k" and "1.2M" all
    // read correctly; anything unusable leaves the site at 0 and is counted.
    const traffic = parseTrafficCell(
      get(row, ["traffic", "monthly traffic", "monthlytraffic", "organic traffic", "visits", "monthly visits", "sessions"])
    );
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
    // Counted here, after the skip checks, so the confirmation never credits a
    // DA on a row that was thrown away for a missing website or price.
    if (da !== null) daRows++;
    if (traffic === null) missingTraffic++;
    data.push({
      publisherId: user.id,
      domain,
      url: `https://${domain}`,
      category: niche.replace(/;/g, ","),
      country,
      language,
      domainRating: 0,
      monthlyTraffic: traffic ?? 0,
      // No Ahrefs call happens during a bulk upload, so DR is still 0 here and
      // gets filled in later by "Refresh DR". A DA row can therefore show its
      // real number immediately, while a DR row shows 0 until the refresh runs -
      // which is how bulk upload already behaved. Traffic is different: it is
      // whatever the sheet said, and stays 0 if the sheet said nothing usable.
      authorityType: da !== null ? AUTHORITY_DA : undefined,
      domainAuthority: da || 0,
      authorityScore: da || 0,
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
    (daRows
      ? ` ${daRows} site(s) had a Domain Authority in the DA column and will display DA instead of DR.`
      : "") +
    (missingTraffic
      ? ` ${missingTraffic} row(s) had no readable monthly traffic and were listed at 0 - traffic is no longer fetched automatically, so add it on Websites (a live site goes back to our team for a quick check when you change it).`
      : "") +
    (created - daRows > 0 ? ` Domain Rating for the other site(s) is added shortly.` : "");
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

/**
 * Let a publisher change which authority number their site displays, or correct
 * the DA they entered.
 *
 * This is deliberately the ONLY thing a publisher can edit on a live listing.
 * DA is a claim we cannot verify against Moz, so a change here does not go
 * straight to buyers - the site returns to "pending" and an admin sees the new
 * number, and the real Ahrefs DR beside it, before it goes back on sale. A site
 * currently held on a pricing conflict keeps that status: sending it to
 * "pending" would let it slip past the conflicts queue and publish alongside
 * the rival listing it is waiting on.
 */
export async function changeAuthorityAction(formData: FormData) {
  const user = await requireRole("publisher");
  const id = parseInt(String(formData.get("id") || "0")) || 0;
  const chosen = authorityTypeOf(String(formData.get("authorityType") || ""));
  const daValue = parseDaInput(formData.get("domainAuthority"));

  // Scope the lookup to this publisher so an id from another account cannot be
  // edited by posting the form by hand.
  const listing = await prisma.listing.findFirst({ where: { id, publisherId: user.id } });
  if (!listing) redirect(`/my-listings?error=${q("That website was not found.")}`);

  if (chosen === AUTHORITY_DA && daValue === null) {
    redirect(`/my-listings?error=${q("Enter a Domain Authority between 1 and 100, or choose Domain Rating.")}`);
  }

  const next = {
    authorityType: chosen,
    domainRating: listing!.domainRating,
    domainAuthority: chosen === AUTHORITY_DA ? daValue! : 0,
  };

  // Nothing actually changed - do not send a live site back to review for it.
  if (
    next.authorityType === listing!.authorityType &&
    next.domainAuthority === listing!.domainAuthority
  ) {
    redirect(`/my-listings?success=${q("No change - that is already what this website shows.")}`);
  }

  await prisma.listing.update({
    where: { id: listing!.id },
    data: {
      authorityType: next.authorityType,
      domainAuthority: next.domainAuthority,
      authorityScore: authorityScoreFor(next),
      // A conflict is waiting on an admin price decision; leave it there.
      status: listing!.status === STATUS_CONFLICT ? listing!.status : "pending",
    },
  });

  revalidatePath("/my-listings");
  revalidatePath("/marketplace");
  redirect(
    `/my-listings?success=${q(
      chosen === AUTHORITY_DA
        ? `Updated. ${listing!.domain} will show DA ${next.domainAuthority} once our team has checked it.`
        : `Updated. ${listing!.domain} will show its Ahrefs Domain Rating once our team has checked it.`
    )}`
  );
}

/**
 * Let a publisher correct the monthly traffic they entered.
 *
 * Traffic used to come from Ahrefs and could not be wrong for long. It is a
 * publisher-supplied claim now, which puts it in exactly the same class as DA:
 * we cannot verify it, so a change does not go straight to buyers. The site
 * returns to "pending" and an admin sees the new number before it goes back on
 * sale. A site held on a pricing conflict keeps that status, for the same
 * reason as in changeAuthorityAction - sending it to "pending" would let it
 * slip past the conflicts queue.
 */
export async function changeTrafficAction(formData: FormData) {
  const user = await requireRole("publisher");
  const id = parseInt(String(formData.get("id") || "0")) || 0;
  const traffic = parseTrafficInput(formData.get("monthlyTraffic"));

  // Scoped to this publisher so an id from another account cannot be edited by
  // posting the form by hand.
  const listing = await prisma.listing.findFirst({ where: { id, publisherId: user.id } });
  if (!listing) redirect(`/my-listings?error=${q("That website was not found.")}`);

  if (traffic === null) {
    redirect(`/my-listings?error=${q("Enter monthly traffic as a number, for example 12000.")}`);
  }
  if (traffic === listing!.monthlyTraffic) {
    redirect(`/my-listings?success=${q("No change - that is already the traffic on this website.")}`);
  }

  // Only a site that is already live in front of buyers goes back for review.
  // A site still waiting on approval is being finished, not revised, so the
  // publisher can correct it freely - and a conflict stays a conflict, or the
  // edit would let it slip past the conflicts queue.
  //
  // The test is the listing's status, deliberately not "was the old traffic 0".
  // 0 does not mean "never entered": a site could be approved at 0 and then
  // quietly edited to 900,000, which is exactly the revision review exists for.
  const wasLive = listing!.status === "approved";
  await prisma.listing.update({
    where: { id: listing!.id },
    data: {
      monthlyTraffic: traffic!,
      status: wasLive ? "pending" : listing!.status,
    },
  });

  revalidatePath("/my-listings");
  revalidatePath("/marketplace");
  redirect(
    `/my-listings?success=${q(
      wasLive
        ? `Updated. ${listing!.domain} will show ${traffic!.toLocaleString("en-US")} monthly traffic once our team has checked it.`
        : `Updated. ${listing!.domain} is set to ${traffic!.toLocaleString("en-US")} monthly traffic.`
    )}`
  );
}
