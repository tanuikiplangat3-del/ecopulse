"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { appUrl } from "@/lib/stripe";
import {
  emailEnabled,
  sendInviteEmail,
  sendApplicationRejected,
  sendAdminInviteEmail,
  sendPublisherPaid,
  sendTestEmail,
  ADMIN_NOTIFY,
} from "@/lib/email";
import { ahrefsEnabled } from "@/lib/ahrefs";
import { refreshDueMetrics, REFRESH_AFTER_DAYS } from "@/lib/metrics";

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

/**
 * Invite another admin by email. Admin invites grant full access, so they are
 * always tied to one address and are never shareable links.
 */
export async function inviteAdminAction(formData: FormData) {
  await requireRole("admin");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    redirect(`/admin/invites?error=${q("Enter a valid email address for the new admin.")}`);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) redirect(`/admin/invites?error=${q("A user with that email already exists.")}`);

  const token = randomBytes(24).toString("hex");
  await prisma.invite.create({
    data: { email, token, role: "admin", expiresAt: new Date(Date.now() + 7 * 86400_000) },
  });
  const link = `${appUrl()}/accept-invite?token=${token}`;

  if (emailEnabled()) {
    await sendAdminInviteEmail(email, link);
    redirect(`/admin/invites?success=${q("Admin invite sent to " + email)}`);
  }
  redirect(`/admin/invites?success=${q("Admin invite created. Share this link only with " + email + ": " + link)}`);
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
 * Refresh DR + monthly traffic on demand. The app already does this on its own
 * every 7 days (see lib/metrics-scheduler.ts); this button is for when an admin
 * does not want to wait - after a big bulk upload, for example.
 *
 * One batch per click, so the request never outlives the load balancer.
 */
export async function refreshListingMetricsAction() {
  await requireRole("admin");
  if (!ahrefsEnabled()) {
    redirect(`/admin/listings?error=${q("The Ahrefs API key is not set on the server, so DR and traffic cannot be fetched.")}`);
  }

  const r = await refreshDueMetrics({ maxItems: 600, budgetMs: 25_000, parallel: 10 });

  if (r.processed === 0) {
    redirect(`/admin/listings?success=${q("Every website is already up to date.")}`);
  }

  revalidatePath("/admin/listings");
  revalidatePath("/marketplace");
  revalidatePath("/");
  const msg =
    `Refreshed ${r.updated} website(s).` +
    (r.failed ? ` ${r.failed} could not be reached - they will be retried automatically.` : "") +
    (r.remaining ? ` ${r.remaining} still to go - click Refresh again to continue.` : " All websites are up to date.");
  redirect(`/admin/listings?success=${q(msg)}`);
}

/**
 * Send a test email to the admin desk. Lets an admin prove the email layer works
 * without having to take a real payment first, and reports the exact reason when
 * it does not - the Resend API rejects messages without throwing, so a failure
 * here is the quickest way to see why nothing is arriving.
 */
export async function sendTestEmailAction() {
  await requireRole("admin");
  if (!emailEnabled()) {
    redirect(`/admin?error=${q("RESEND_API_KEY is not set on the server, so no email can be sent.")}`);
  }
  const ok = await sendTestEmail();
  if (ok) {
    redirect(`/admin?success=${q("Test email sent to " + ADMIN_NOTIFY + ". If it does not arrive, check the sending domain in Resend.")}`);
  }
  redirect(`/admin?error=${q("Resend rejected the message. Check the container logs for a line starting [email] REJECTED - it names the reason.")}`);
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

  // Tell the publisher their payment was approved.
  if (emailEnabled()) {
    const full = await prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: { include: { publisher: true } } },
    });
    const pub = full?.listing.publisher;
    if (pub) await sendPublisherPaid(pub.email, orderId, full!.listing.domain);
  }

  revalidatePath("/admin/orders");
  redirect(`/admin/orders?success=${q("Publisher marked as paid. Buyer hold released.")}`);
}
