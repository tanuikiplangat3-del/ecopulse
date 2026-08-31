"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";
import { buyerPrice, commissionRate } from "@/lib/money";
import { createCheckout, stripeEnabled } from "@/lib/stripe";
import { emailEnabled, sendOrderNotice, sendNewOrderEmails, sendLiveUrlAdmin, sendOrderConfirmedEmails } from "@/lib/email";

const q = (s: string) => encodeURIComponent(s);

/** Read an uploaded file into a data URL, capped at maxBytes. Returns "too_big" if over. */
async function readUpload(
  entry: FormDataEntryValue | null,
  maxBytes: number
): Promise<{ url: string; name: string } | "too_big" | null> {
  if (!entry || typeof entry === "string") return null;
  const file = entry as File;
  if (!file || file.size === 0) return null;
  if (file.size > maxBytes) return "too_big";
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  return { url: `data:${mime};base64,${buf.toString("base64")}`, name: file.name };
}

export async function placeOrderAction(formData: FormData) {
  const user = await requireRole("buyer");
  const listingId = parseInt(String(formData.get("listingId") || "0"));
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "approved") {
    redirect(`/marketplace?error=${q("That listing is not available.")}`);
  }

  // Turnaround: only 5, 7 or 10 days are offered.
  let tat = parseInt(String(formData.get("turnaroundDays") || "7"));
  if (![5, 7, 10].includes(tat)) tat = 7;

  // Optional uploads (image up to 4MB, document up to 6MB), stored as data URLs.
  const doc = await readUpload(formData.get("articleDoc"), 6 * 1024 * 1024);
  if (doc === "too_big") redirect(`/listing/${listingId}?error=${q("Your document is larger than 6MB. Please upload a smaller file.")}`);
  const img = await readUpload(formData.get("featuredImageFile"), 4 * 1024 * 1024);
  if (img === "too_big") redirect(`/listing/${listingId}?error=${q("Your image is larger than 4MB. Please upload a smaller image.")}`);

  const amount = buyerPrice(listing!.priceCents, listing!.markupModel);
  const order = await prisma.order.create({
    data: {
      buyerId: user.id,
      listingId: listing!.id,
      targetUrl: String(formData.get("targetUrl") || "").trim(),
      anchorText: String(formData.get("anchorText") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      articleContent: String(formData.get("articleContent") || "").trim(),
      featuredImage: img ? img.url : String(formData.get("featuredImage") || "").trim(),
      articleDocName: doc ? doc.name : null,
      articleDocUrl: doc ? doc.url : null,
      turnaroundDays: tat,
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
    redirect(`/orders/${orderId}?error=${q("Card payments are unavailable right now. Please pay from your wallet balance.")}`);
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
  if (!["funded", "in_progress"].includes(order!.status))
    redirect(`/orders/${orderId}?error=${q("Confirm you received the order first.")}`);
  if (!/^https?:\/\//.test(liveUrl)) redirect(`/orders/${orderId}?error=${q("Enter a valid live URL.")}`);

  await prisma.order.update({ where: { id: orderId }, data: { status: "live", liveUrl } });
  if (emailEnabled()) {
    if (order!.buyer) {
      await sendOrderNotice(order!.buyer.email, "Your link is live", `The publisher submitted the live URL for order #${orderId}: ${liveUrl}. Please confirm in your dashboard.`);
    }
    await sendLiveUrlAdmin(orderId, order!.listing.domain, liveUrl);
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
  await notifyOrderConfirmed(orderId);
  revalidatePath("/orders");
  redirect(`/orders/${orderId}?success=${q("Order completed. Thank you!")}`);
}

/** Admin confirms the link is live on the buyer's behalf -> completed. */
export async function adminConfirmLiveAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "admin") redirect(`/orders?error=${q("Admins only.")}`);
  const orderId = parseInt(String(formData.get("orderId") || "0"));
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { buyer: true } });
  if (!order || order.status !== "live") redirect(`/admin/orders?error=${q("Order is not awaiting confirmation.")}`);
  await prisma.order.update({ where: { id: orderId }, data: { status: "completed" } });
  if (emailEnabled() && order!.buyer) {
    await sendOrderNotice(order!.buyer.email, "Your order is complete", `Order #${orderId} has been confirmed live and marked complete.`);
  }
  await notifyOrderConfirmed(orderId);
  revalidatePath("/admin/orders");
  redirect(`/admin/orders?success=${q("Order confirmed live.")}`);
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

/** Order completed -> tell the publisher and the admin desk (starts the 72h clock). */
async function notifyOrderConfirmed(orderId: number) {
  if (!emailEnabled()) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: { include: { publisher: true } } },
  });
  const pub = order?.listing.publisher;
  if (pub) {
    await sendOrderConfirmedEmails({
      publisherEmail: pub.email,
      domain: order!.listing.domain,
      orderId,
      payoutCents: order!.payoutCents,
    });
  }
}

async function notifyPublisherFunded(orderId: number) {
  if (!emailEnabled()) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: { include: { publisher: true } }, buyer: true },
  });
  const pub = order?.listing.publisher;
  if (pub) {
    await sendNewOrderEmails({
      publisherEmail: pub.email,
      domain: order!.listing.domain,
      orderId,
      buyerName: order!.buyer?.name,
    });
  }
}

/** Publisher confirms they received the order -> status moves to in progress. */
export async function confirmReceiptAction(formData: FormData) {
  const user = await requireRole("publisher");
  const orderId = parseInt(String(formData.get("orderId") || "0"));
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: true, buyer: true },
  });
  if (!order || order.listing.publisherId !== user.id) redirect(`/orders?error=${q("Not your order.")}`);
  if (order!.status !== "funded") redirect(`/orders/${orderId}?error=${q("This order can't be confirmed.")}`);

  await prisma.order.update({ where: { id: orderId }, data: { status: "in_progress" } });
  if (emailEnabled() && order!.buyer) {
    await sendOrderNotice(order!.buyer.email, "Your order is in progress", `The publisher has confirmed your order #${orderId} on ${order!.listing.domain} and started work. You'll be notified when the link is live.`);
  }
  revalidatePath("/orders");
  redirect(`/orders/${orderId}?success=${q("Order confirmed. It is now in progress.")}`);
}
