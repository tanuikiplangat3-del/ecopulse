"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { appUrl } from "@/lib/stripe";
import { emailEnabled, sendInviteEmail, sendApplicationRejected } from "@/lib/email";
import { ahrefsEnabled, fetchDomainMetrics } from "@/lib/ahrefs";

const q = (s: string) => encodeURIComponent(s);

export async function invitePublisherAction(formData: FormData) {
  await requireRole("admin");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    redirect(`/admin/invites?error=${q("Enter a valid email address.")}`);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) redirect(`/admin/invites?error=${q("A user with that email already exists.")}`);

  const token = randomBytes(24).toString("hex");
  await prisma.invite.create({
    data: { email, token, role: "publisher", expiresAt: new Date(Date.now() + 7 * 86400_000) },
  });
  const link = `${appUrl()}/accept-invite?token=${token}`;

  if (emailEnabled()) {
    await sendInviteEmail(email, link);
    redirect(`/admin/invites?success=${q("Invite sent to " + email)}`);
  }
  // Email off - show the link so the admin can share it manually.
  redirect(`/admin/invites?success=${q("Invite created. Share this link: " + link)}`);
}

/** Create a shareable publisher invite link (not tied to a specific email). */
export async function createShareInviteAction() {
  await requireRole("admin");
  const token = randomBytes(24).toString("hex");
  await prisma.invite.create({
    data: { email: null, token, role: "publisher", expiresAt: new Date(Date.now() + 7 * 86400_000) },
  });
  const link = `${appUrl()}/accept-invite?token=${token}`;
  redirect(`/admin/invites?success=${q("Shareable invite link created. Send it to your publisher: " + link)}`);
}

export async function revokeInviteAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  await prisma.invite.deleteMany({ where: { id, acceptedAt: null } });
  redirect(`/admin/invites?success=${q("Invite revoked.")}`);
}

export async function approveListingAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  await prisma.listing.update({ where: { id }, data: { status: "approved" } });
  revalidatePath("/admin/listings");
  revalidatePath("/marketplace");
  redirect(`/admin/listings?success=${q("Listing approved.")}`);
}

export async function rejectListingAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  await prisma.listing.update({ where: { id }, data: { status: "rejected" } });
  revalidatePath("/admin/listings");
  redirect(`/admin/listings?success=${q("Listing rejected.")}`);
}

export async function approveAllListingsAction() {
  await requireRole("admin");
  await prisma.listing.updateMany({ where: { status: "pending" }, data: { status: "approved" } });
  revalidatePath("/admin/listings");
  revalidatePath("/marketplace");
  redirect(`/admin/listings?success=${q("All pending listings approved.")}`);
}

/**
 * Backfill DR + monthly traffic for listings that still show 0 (bulk-uploaded rows
 * past the live-fetch cap, or anything added before the Ahrefs key was in place).
 * Runs one batch per click so the request never outlives the load balancer.
 */
export async function refreshListingMetricsAction() {
  await requireRole("admin");
  if (!ahrefsEnabled()) {
    redirect(`/admin/listings?error=${q("AHREFS_API_KEY is not set on the server, so DR and traffic cannot be fetched.")}`);
  }

  const PARALLEL = 10;              // simultaneous Ahrefs calls
  const CANDIDATES = 600;           // how many to pull into memory per click
  const DEADLINE = Date.now() + 25_000; // stop before the load balancer times out

  const stale = await prisma.listing.findMany({
    where: { domainRating: 0, monthlyTraffic: 0 },
    orderBy: { id: "asc" },
    take: CANDIDATES,
  });
  if (stale.length === 0) {
    redirect(`/admin/listings?success=${q("Every website already has DR and traffic.")}`);
  }

  let updated = 0;
  let failed = 0;
  for (let i = 0; i < stale.length; i += PARALLEL) {
    if (Date.now() > DEADLINE) break; // finish this click; the admin clicks again to continue
    const chunk = stale.slice(i, i + PARALLEL);
    const results = await Promise.all(chunk.map((l) => fetchDomainMetrics(l.domain)));
    for (let j = 0; j < chunk.length; j++) {
      const { dr, traffic, ok } = results[j];
      // Never overwrite with zeros when Ahrefs did not actually answer.
      if (!ok) { failed++; continue; }
      if (dr === 0 && traffic === 0) continue;
      await prisma.listing.update({
        where: { id: chunk[j].id },
        data: { domainRating: dr, monthlyTraffic: traffic },
      });
      updated++;
    }
  }

  const remaining = await prisma.listing.count({ where: { domainRating: 0, monthlyTraffic: 0 } });
  revalidatePath("/admin/listings");
  revalidatePath("/marketplace");
  const msg =
    `Refreshed ${updated} website(s).` +
    (failed ? ` ${failed} could not be reached - check the logs.` : "") +
    (remaining ? ` ${remaining} still at 0 - click Refresh again to continue.` : " All websites are up to date.");
  redirect(`/admin/listings?success=${q(msg)}`);
}

/** Super admin: permanently delete any user (and their sites/orders via cascade). */
export async function deleteUserAction(formData: FormData) {
  const me = await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  if (id === me.id) redirect(`/admin/users?error=${q("You cannot delete your own account.")}`);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect(`/admin/users?error=${q("User not found.")}`);
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  revalidatePath("/marketplace");
  redirect(`/admin/users?success=${q("Deleted " + target!.email + ".")}`);
}

/** Approve a publisher request: create an invite and email them the sign-up link. */
export async function approveApplicationAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  const app = await prisma.publisherApplication.findUnique({ where: { id } });
  if (!app) redirect(`/admin/applications?error=${q("Request not found.")}`);

  const existing = await prisma.user.findUnique({ where: { email: app!.email } });
  if (existing) {
    await prisma.publisherApplication.update({ where: { id }, data: { status: "approved" } });
    redirect(`/admin/applications?error=${q("An account already exists for that email.")}`);
  }

  const token = randomBytes(24).toString("hex");
  await prisma.invite.create({
    data: { email: app!.email, token, role: "publisher", expiresAt: new Date(Date.now() + 7 * 86400_000) },
  });
  const link = `${appUrl()}/accept-invite?token=${token}`;
  if (emailEnabled()) await sendInviteEmail(app!.email, link);
  await prisma.publisherApplication.update({ where: { id }, data: { status: "approved" } });
  revalidatePath("/admin/applications");
  redirect(`/admin/applications?success=${q(emailEnabled() ? "Approved. Sign-up link emailed to " + app!.email : "Approved. Share this link: " + link)}`);
}

/** Reject a publisher request: email the applicant with an optional note. */
export async function rejectApplicationAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  const note = String(formData.get("note") || "").trim();
  const app = await prisma.publisherApplication.findUnique({ where: { id } });
  if (!app) redirect(`/admin/applications?error=${q("Request not found.")}`);
  if (emailEnabled()) await sendApplicationRejected(app!.email, note);
  await prisma.publisherApplication.update({ where: { id }, data: { status: "rejected" } });
  revalidatePath("/admin/applications");
  redirect(`/admin/applications?success=${q("Request rejected and the applicant was notified.")}`);
}

export async function markPublisherPaidAction(formData: FormData) {
  await requireRole("admin");
  const orderId = parseInt(String(formData.get("orderId") || "0"));
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !["live", "completed"].includes(order.status)) {
    redirect(`/admin/orders?error=${q("The link must be live before you can pay the publisher.")}`);
  }
  // Paying settles the order: mark paid and close it (releases the buyer's hold).
  await prisma.order.update({
    where: { id: orderId },
    data: { publisherPaid: true, status: "completed" },
  });
  revalidatePath("/admin/orders");
  redirect(`/admin/orders?success=${q("Publisher marked as paid. Buyer hold released.")}`);
}
