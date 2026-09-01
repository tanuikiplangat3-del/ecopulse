"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { centsFromUsd, MARKUP_REQUESTED } from "@/lib/money";
import { emailEnabled, sendSiteRequestAdmin, sendSiteRequestDecision } from "@/lib/email";

const q = (s: string) => encodeURIComponent(s);

/** A buyer submits a publisher they have negotiated with, for us to review and list. */
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
  const country = String(formData.get("country") || "").trim();
  const language = String(formData.get("language") || "English").trim();
  const linkType = String(formData.get("linkType") || "guest_post");
  const vatApplies = String(formData.get("vatApplies") || "") === "yes";
  const vatPercent = vatApplies ? parseFloat(String(formData.get("vatPercent") || "0")) || 0 : 0;
  const agreed72h = String(formData.get("agreed72h") || "") === "on";
  const agreedFee = String(formData.get("agreedFee") || "") === "on";
  const payMethod = String(formData.get("payMethod") || "paypal");
  const payDetails = String(formData.get("payDetails") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  const domain = rawDomain.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");

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
    redirect(`${back}?error=${q("Please accept the 5% platform service fee to continue.")}`);

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

/** Admin approves a request -> it becomes a live listing straight away. */
export async function approveSiteRequestAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  const req = await prisma.siteRequest.findUnique({ where: { id } });
  if (!req || req.status !== "pending")
    redirect(`/admin/site-requests?error=${q("That request is not awaiting review.")}`);

  const publisherId = await externalPublisherId();
  const listing = await prisma.listing.create({
    data: {
      publisherId,
      domain: req!.domain,
      url: `https://${req!.domain}`,
      category: req!.category,
      country: req!.country,
      language: req!.language,
      linkType: req!.linkType,
      priceCents: req!.negotiatedCents,
      tatDays: req!.tatDays,
      description: req!.notes || "",
      status: "approved", // approving the request lists it immediately
      markupModel: MARKUP_REQUESTED,
      requestedById: req!.buyerId,
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
  redirect(`/admin/site-requests?success=${q(req!.domain + " approved and listed.")}`);
}

/** Admin rejects a request, with an optional reason passed on to the buyer. */
export async function rejectSiteRequestAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  const note = String(formData.get("note") || "").trim();
  const req = await prisma.siteRequest.findUnique({ where: { id } });
  if (!req || req.status !== "pending")
    redirect(`/admin/site-requests?error=${q("That request is not awaiting review.")}`);

  await prisma.siteRequest.update({
    where: { id },
    data: { status: "rejected", adminNote: note || null },
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
