"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { centsFromUsd, MARKUP_REQUESTED, MARKUP_TIERED } from "@/lib/money";
import { emailEnabled, sendSiteRequestAdmin, sendSiteRequestDecision, sendPublisherLinkToBuyer } from "@/lib/email";
import { appUrl } from "@/lib/stripe";
import { normalizeDomain, STATUS_CONFLICT } from "@/lib/duplicates";
import { normalizeCountry } from "@/lib/data";

const q = (s: string) => encodeURIComponent(s);

/**
 * LEGACY: the long "tell us everything about the publisher" form.
 *
 * No longer reachable from the buyer UI. As of 14 Sep 2026 a buyer just enters
 * the publisher's email on /request-site and gets a sign-up link immediately -
 * see app/actions/publisher-invites.ts. This action, the SiteRequest model and
 * Admin -> Site requests are kept for the requests already in the system, and
 * for the fallback where a publisher will not register and we list the site on
 * the container account ourselves.
 */
export async function submitSiteRequestAction(formData: FormData) {
  const user = await requireRole("buyer");
  const back = "/request-site";

  const siteName = String(formData.get("siteName") || "").trim();
  const rawDomain = String(formData.get("domain") || "").trim();
  const priceUsd = parseFloat(String(formData.get("price") || "0"));
  const publisherName = String(formData.get("publisherName") || "").trim();
  const publisherEmail = String(formData.get("publisherEmail") || "").trim().toLowerCase();
  const publisherPhone = String(formData.get("publisherPhone") || "").trim();
  const tatDays = parseInt(String(formData.get("tatDays") || "7")) || 7;
  const category = String(formData.get("category") || "General").trim();
  const rawCountry = String(formData.get("country") || "").trim();
  // The picker sends a canonical name; normalising keeps the listing findable
  // by country even if it ever sends a variant.
  const country = normalizeCountry(rawCountry) || rawCountry;
  const language = String(formData.get("language") || "English").trim();
  const linkType = String(formData.get("linkType") || "guest_post");
  const vatApplies = String(formData.get("vatApplies") || "") === "yes";
  const vatPercent = vatApplies ? parseFloat(String(formData.get("vatPercent") || "0")) || 0 : 0;
  const agreed72h = String(formData.get("agreed72h") || "") === "on";
  const agreedFee = String(formData.get("agreedFee") || "") === "on";
  const payMethod = String(formData.get("payMethod") || "paypal");
  const payDetails = String(formData.get("payDetails") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  const domain = normalizeDomain(rawDomain);

  if (!siteName) redirect(`${back}?error=${q("Please enter the publisher's site name.")}`);
  if (!domain) redirect(`${back}?error=${q("Please enter the website domain.")}`);
  if (!priceUsd || priceUsd <= 0) redirect(`${back}?error=${q("Enter the price you agreed with the publisher.")}`);
  if (!country) redirect(`${back}?error=${q("Please choose a country.")}`);
  if (!publisherEmail && !publisherPhone)
    redirect(`${back}?error=${q("Give us at least one way to reach the publisher - an email or a phone number.")}`);
  if (vatApplies && (vatPercent <= 0 || vatPercent > 100))
    redirect(`${back}?error=${q("Enter a valid VAT percentage between 0 and 100.")}`);
  if (!payDetails) redirect(`${back}?error=${q("Tell us how the publisher should be paid.")}`);
  // Both agreements are conditions of listing, not preferences.
  if (!agreed72h)
    redirect(`${back}?error=${q("We can only list a publisher who accepts payment within 72 hours of the buyer confirming the link.")}`);
  if (!agreedFee)
    redirect(`${back}?error=${q("Please accept the platform pricing terms to continue.")}`);

  const req = await prisma.siteRequest.create({
    data: {
      buyerId: user.id,
      siteName,
      domain,
      negotiatedCents: centsFromUsd(priceUsd),
      publisherName: publisherName || null,
      publisherEmail: publisherEmail || null,
      publisherPhone: publisherPhone || null,
      tatDays,
      category: category || "General",
      country,
      language: language || "English",
      linkType,
      vatApplies,
      vatPercent,
      agreed72h,
      agreedFee,
      payMethod,
      payDetails,
      notes: notes || null,
      status: "pending",
    },
  });

  if (emailEnabled()) {
    await sendSiteRequestAdmin({
      requestId: req.id,
      buyerName: user.name,
      buyerEmail: user.email,
      siteName,
      domain,
      negotiatedCents: req.negotiatedCents,
      vatPercent,
    });
  }

  redirect(`${back}?success=${q("Request submitted. Our team will review " + domain + " and let you know.")}`);
}

/**
 * Generate the publisher sign-up link for a site request.
 *
 * This is the normal path now. Instead of us listing the site on a container
 * account and paying the publisher by hand, the buyer forwards this link to the
 * publisher they negotiated with. Whoever registers through it gets a real
 * publisher account, lists their own sites, and is paid like any other
 * publisher - and every site they list carries this buyer's negotiated rate:
 * half margin on that buyer's first 3 orders per site, standard margin for
 * everyone else.
 *
 * The link is single-use and expires in 30 days. approveSiteRequestAction is
 * still there as the fallback for a publisher who will not sign up.
 */
export async function createPublisherLinkAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  const req = await prisma.siteRequest.findUnique({ where: { id } });
  if (!req || !["pending", "invited"].includes(req.status))
    redirect(`/admin/site-requests?error=${q("That request is not awaiting review.")}`);

  const buyer = await prisma.user.findUnique({ where: { id: req!.buyerId } });
  if (!buyer) redirect(`/admin/site-requests?error=${q("The buyer who made this request no longer exists.")}`);

  // Generating a second link retires the first, so an old link that was already
  // forwarded cannot be used later to create a duplicate publisher account.
  await prisma.invite.deleteMany({ where: { siteRequestId: req!.id, acceptedAt: null } });

  const token = randomBytes(24).toString("hex");
  await prisma.invite.create({
    data: {
      email: req!.publisherEmail || null,
      token,
      role: "publisher",
      requestedById: req!.buyerId,
      siteRequestId: req!.id,
      expiresAt: new Date(Date.now() + 30 * 86400_000),
    },
  });
  const link = `${appUrl()}/accept-invite?token=${token}`;

  await prisma.siteRequest.update({
    where: { id },
    data: { status: "invited", inviteToken: token },
  });

  if (emailEnabled()) {
    try {
      await sendPublisherLinkToBuyer({
        buyerEmail: buyer!.email,
        buyerName: buyer!.name,
        domain: req!.domain,
        publisherName: req!.publisherName,
        link,
      });
    } catch (e: any) {
      // The link exists and is on screen either way - never lose it to a mail
      // failure.
      console.error(`[site-requests] could not email the publisher link for #${id}: ${e?.message || e}`);
    }
  }

  revalidatePath("/admin/site-requests");
  redirect(
    `/admin/site-requests?success=${q(
      `Publisher link created for ${req!.domain} and emailed to ${buyer!.email}. Copy it from the request below if you want to send it yourself: ${link}`
    )}`
  );
}

/**
 * The placeholder publisher account that buyer-requested sites hang off.
 * These publishers have no login - we hold their contact and payment details on
 * the request itself - but a Listing must belong to a publisher, so they all
 * share one clearly-named account.
 */
async function externalPublisherId(): Promise<number> {
  const email = "external-publishers@welcometomorrow.io";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      name: "External publishers (buyer-requested)",
      email,
      // Random, never shared: this account is a container, not a login.
      passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      role: "publisher",
      verified: true,
      tuesdayAgreed: true,
    },
  });
  return created.id;
}

/**
 * FALLBACK: list the site ourselves on the container account, the old way.
 *
 * Use this only when the publisher will not register through a link - they get
 * paid by hand, and the buyer confirms publication because there is no
 * publisher account to do it. createPublisherLinkAction above is the normal
 * path.
 */
export async function approveSiteRequestAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  const req = await prisma.siteRequest.findUnique({ where: { id } });
  if (!req || !["pending", "invited"].includes(req.status))
    redirect(`/admin/site-requests?error=${q("That request is not awaiting review.")}`);

  // Listing it ourselves retires any outstanding link, so the publisher cannot
  // later register and end up with a second listing for the same domain.
  await prisma.invite.deleteMany({ where: { siteRequestId: req!.id, acceptedAt: null } });

  const publisherId = await externalPublisherId();

  // The reduced rate is a reward for bringing us inventory we do not already
  // carry. If this domain is already on the marketplace, listing it as
  // "requested" would let any buyer convert an existing site into a discounted
  // one for themselves - and, because the cheapest copy wins, take our own
  // listing off the marketplace in the process. So an already-listed domain is
  // created as an ordinary tiered listing at the negotiated price: everyone,
  // including the requester, pays the standard margin.
  const alreadyListed = await prisma.listing.count({
    where: {
      status: "approved",
      // Real inventory only. A demo row must never make a real domain look like
      // one we already carry, which would quietly strip the buyer's rate.
      isDemo: false,
      OR: [
        { domain: { equals: normalizeDomain(req!.domain), mode: "insensitive" } },
        { domain: { equals: `www.${normalizeDomain(req!.domain)}`, mode: "insensitive" } },
      ],
    },
  });
  const isNewInventory = alreadyListed === 0;

  const listing = await prisma.listing.create({
    data: {
      publisherId,
      domain: normalizeDomain(req!.domain),
      url: `https://${normalizeDomain(req!.domain)}`,
      category: req!.category,
      country: req!.country,
      language: req!.language,
      linkType: req!.linkType,
      priceCents: req!.negotiatedCents,
      tatDays: req!.tatDays,
      description: req!.notes || "",
      // A brand-new domain goes live immediately. One we already carry is held
      // as a conflict so an admin can compare the two prices on Admin ->
      // Conflicts before anything changes on the marketplace.
      status: isNewInventory ? "approved" : STATUS_CONFLICT,
      markupModel: isNewInventory ? MARKUP_REQUESTED : MARKUP_TIERED,
      requestedById: isNewInventory ? req!.buyerId : null,
      siteRequestId: req!.id,
      vatPercent: req!.vatPercent,
    },
  });

  await prisma.siteRequest.update({
    where: { id },
    data: { status: "approved", listingId: listing.id },
  });

  if (emailEnabled()) {
    const buyer = await prisma.user.findUnique({ where: { id: req!.buyerId } });
    if (buyer) {
      await sendSiteRequestDecision({
        to: buyer.email,
        approved: true,
        domain: req!.domain,
        listingId: listing.id,
      });
    }
  }

  revalidatePath("/admin/site-requests");
  revalidatePath("/marketplace");
  redirect(
    `/admin/site-requests?success=${q(
      isNewInventory
        ? req!.domain + " approved and listed. The buyer gets their negotiated rate on their first 3 orders."
        : req!.domain + " is already on the marketplace, so it was NOT listed yet - it is waiting on Admin > Conflicts for you to compare the two prices. It also carries standard pricing rather than the discounted requester rate, because we already had this domain."
    )}`
  );
}

/** Admin rejects a request, with an optional reason passed on to the buyer. */
export async function rejectSiteRequestAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  const note = String(formData.get("note") || "").trim();
  const req = await prisma.siteRequest.findUnique({ where: { id } });
  if (!req || !["pending", "invited"].includes(req.status))
    redirect(`/admin/site-requests?error=${q("That request is not awaiting review.")}`);

  // Kill any link that was already generated for it.
  await prisma.invite.deleteMany({ where: { siteRequestId: req!.id, acceptedAt: null } });

  await prisma.siteRequest.update({
    where: { id },
    data: { status: "rejected", adminNote: note || null, inviteToken: null },
  });

  if (emailEnabled()) {
    const buyer = await prisma.user.findUnique({ where: { id: req!.buyerId } });
    if (buyer) {
      await sendSiteRequestDecision({
        to: buyer.email,
        approved: false,
        domain: req!.domain,
        note,
      });
    }
  }

  revalidatePath("/admin/site-requests");
  redirect(`/admin/site-requests?success=${q(req!.domain + " rejected and the buyer was notified.")}`);
}
