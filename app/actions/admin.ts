"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { appUrl } from "@/lib/stripe";
import { emailEnabled, sendInviteEmail } from "@/lib/email";

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

export async function markPublisherPaidAction(formData: FormData) {
  await requireRole("admin");
  const orderId = parseInt(String(formData.get("orderId") || "0"));
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "completed") redirect(`/admin/orders?error=${q("Order must be completed first.")}`);
  await prisma.order.update({ where: { id: orderId }, data: { publisherPaid: true } });
  redirect(`/admin/orders?success=${q("Marked publisher as paid.")}`);
}
