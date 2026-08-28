"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";
import { buyerPrice, commissionRate } from "@/lib/money";
import { createCheckout, stripeEnabled } from "@/lib/stripe";
import { emailEnabled, sendOrderNotice } from "@/lib/email";

const q = (s: string) => encodeURIComponent(s);

export async function placeOrderAction(formData: FormData) {
  const user = await requireRole("buyer");
  const listingId = parseInt(String(formData.get("listingId") || "0"));
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "approved") {
    redirect(`/marketplace?error=${q("That listing is not available.")}`);
  }

  const amount = buyerPrice(listing!.priceCents);
  const order = await prisma.order.create({
    data: {
      buyerId: user.id,
      listingId: listing!.id,
      targetUrl: String(formData.get("targetUrl") || "").trim(),
      anchorText: String(formData.get("anchorText") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      articleContent: String(formData.get("articleContent") || "").trim(),
      featuredImage: String(formData.get("featuredImage") || "").trim(),
      amountCents: amount,
      payoutCents: listing!.priceCents,
      commissionRate: String(commissionRate()),
      status: "pending_payment",
    },
  });
  redirect(`/orders/${order.id}?success=${q("Order created. Complete payment to fund it.")}`);
}

/** Pay for an order from wallet balance (instant). */
export async function payFromWalletAction(formData: FormData) {
  const user = await requireRole("buyer");
  const orderId = parseInt(String(formData.get("orderId") || "0"));
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== user.id || order.status !== "pending_payment") {
    redirect(`/orders?error=${q("Order not payable.")}`);
  }
  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if ((fresh?.balanceCents ?? 0) < order!.amountCents) {
    redirect(`/orders/${orderId}?error=${q("Not enough wallet balance. Top up or pay by card.")}`);
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { balanceCents: { decrement: order!.amountCents } } }),
    prisma.walletTx.create({ data: { userId: user.id, kind: "spend", amountCents: order!.amountCents, note: `Order #${orderId}` } }),
    prisma.order.update({ where: { id: orderId }, data: { status: "funded" } }),
  ]);
  await notifyPublisherFunded(orderId);
  revalidatePath("/orders");
  redirect(`/orders/${orderId}?success=${q("Order funded from your balance.")}`);
}

/** Start a Stripe Checkout for an order. */
export async function payWithStripeAction(formData: FormData) {
  const user = await requireRole("buyer");
  const orderId = parseInt(String(formData.get("orderId") || "0"));
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { listing: true } });
  if (!order || order.buyerId !== user.id || order.status !== "pending_payment") {
    redirect(`/orders?error=${q("Order not payable.")}`);
  }
  if (!stripeEnabled()) {
    redirect(`/orders/${orderId}?error=${q("Card payments are not configured yet. Add Stripe keys or pay from wallet.")}`);
  }
  const ref = "ord_" + randomBytes(10).toString("hex");
  await prisma.stripeTx.create({
    data: { ref, userId: user.id, purpose: "order", orderId, amountCents: order!.amountCents, status: "pending" },
  });
  const url = await createCheckout({
    amountCents: order!.amountCents,
    label: `Link placement on ${order!.listing.domain} (Order #${orderId})`,
    purpose: "order",
    ref,
    orderId,
    customerEmail: user.email,
  });
  redirect(url);
}

/** Publisher submits the live URL. */
export async function submitLiveAction(formData: FormData) {
  const user = await requireRole("publisher");
  const orderId = parseInt(String(formData.get("orderId") || "0"));
  const liveUrl = String(formData.get("liveUrl") || "").trim();
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { listing: true, buyer: true } });
  if (!order || order.listing.publisherId !== user.id) redirect(`/orders?error=${q("Not your order.")}`);
  if (order!.status !== "funded") redirect(`/orders/${orderId}?error=${q("Order must be funded first.")}`);
  if (!/^https?:\/\//.test(liveUrl)) redirect(`/orders/${orderId}?error=${q("Enter a valid live URL.")}`);

  await prisma.order.update({ where: { id: orderId }, data: { status: "live", liveUrl } });
  if (emailEnabled() && order!.buyer) {
    await sendOrderNotice(order!.buyer.email, "Your link is live", `The publisher submitted the live URL for order #${orderId}: ${liveUrl}. Please confirm in your dashboard.`);
  }
  revalidatePath("/orders");
  redirect(`/orders/${orderId}?success=${q("Live URL submitted. Waiting for buyer confirmation.")}`);
}

/** Buyer confirms the link is live -> completed. */
export async function confirmLiveAction(formData: FormData) {
  const user = await requireRole("buyer");
  const orderId = parseInt(String(formData.get("orderId") || "0"));
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== user.id || order.status !== "live") redirect(`/orders?error=${q("Cannot confirm this order.")}`);
  await prisma.order.update({ where: { id: orderId }, data: { status: "completed" } });
  revalidatePath("/orders");
  redirect(`/orders/${orderId}?success=${q("Order completed. Thank you!")}`);
}

export async function cancelOrderAction(formData: FormData) {
  const user = await requireUser();
  const orderId = parseInt(String(formData.get("orderId") || "0"));
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) redirect(`/orders?error=${q("Order not found.")}`);
  const canCancel = (order.buyerId === user.id || user.role === "admin") && order.status === "pending_payment";
  if (!canCancel) redirect(`/orders/${orderId}?error=${q("This order can no longer be cancelled.")}`);
  await prisma.order.update({ where: { id: orderId }, data: { status: "cancelled" } });
  redirect(`/orders/${orderId}?success=${q("Order cancelled.")}`);
}

async function notifyPublisherFunded(orderId: number) {
  if (!emailEnabled()) return;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { listing: { include: { publisher: true } } } });
  const pub = order?.listing.publisher;
  if (pub) await sendOrderNotice(pub.email, "New funded order", `You have a new funded order #${orderId} on ${order!.listing.domain}. Please publish the link and submit the live URL.`);
}
