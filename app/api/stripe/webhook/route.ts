import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { emailEnabled, sendOrderNotice } from "@/lib/email";

// Stripe needs the raw body to verify the signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "stripe not configured" }, { status: 400 });

  const sig = req.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const ref = session?.metadata?.ref as string | undefined;
    const amount = Number(session?.amount_total ?? 0);
    const currency = String(session?.currency ?? "");

    if (ref) {
      const tx = await prisma.stripeTx.findUnique({ where: { ref } });
      // Idempotent + server-side re-check of amount & currency.
      if (tx && tx.status === "pending" && currency === "usd" && amount === tx.amountCents) {
        await prisma.stripeTx.update({
          where: { ref },
          data: { status: "success", providerId: String(session.id) },
        });

        if (tx.purpose === "order" && tx.orderId) {
          const order = await prisma.order.findUnique({ where: { id: tx.orderId } });
          if (order && order.status === "pending_payment") {
            await prisma.order.update({ where: { id: tx.orderId }, data: { status: "funded" } });
            if (emailEnabled()) {
              const full = await prisma.order.findUnique({
                where: { id: tx.orderId },
                include: { listing: { include: { publisher: true } } },
              });
              const pub = full?.listing.publisher;
              if (pub) await sendOrderNotice(pub.email, "New funded order", `Order #${tx.orderId} on ${full!.listing.domain} is funded. Please publish the link and submit the live URL.`);
            }
          }
        } else if (tx.purpose === "topup") {
          await prisma.$transaction([
            prisma.user.update({ where: { id: tx.userId }, data: { balanceCents: { increment: tx.amountCents } } }),
            prisma.walletTx.create({ data: { userId: tx.userId, kind: "topup", amountCents: tx.amountCents, method: "stripe", note: "Wallet top-up" } }),
          ]);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
