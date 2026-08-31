import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { emailEnabled, sendNewOrderEmails, sendDepositReceipt, sendDepositAdmin } from "@/lib/email";
import { netDeposit } from "@/lib/money";

// Stripe needs the raw body to verify the signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripe) {
    console.error("[stripe-webhook] STRIPE_SECRET_KEY is not set - event ignored.");
    return NextResponse.json({ error: "stripe not configured" }, { status: 400 });
  }

  const sig = req.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const body = await req.text();

  if (!secret) console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set - signature cannot be verified.");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    console.error(`[stripe-webhook] signature check failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 });
  }

  console.log(`[stripe-webhook] received ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const ref = session?.metadata?.ref as string | undefined;
    const amount = Number(session?.amount_total ?? 0);
    const currency = String(session?.currency ?? "");

    if (!ref) console.error("[stripe-webhook] session has no metadata.ref - cannot match it to a transaction.");

    if (ref) {
      const tx = await prisma.stripeTx.findUnique({ where: { ref } });
      // Say out loud why a payment was skipped, instead of failing silently.
      if (!tx) console.error(`[stripe-webhook] no transaction found for ref ${ref}.`);
      else if (tx.status !== "pending") console.log(`[stripe-webhook] ref ${ref} already handled (status ${tx.status}) - skipping.`);
      else if (currency !== "usd") console.error(`[stripe-webhook] ref ${ref} currency was ${currency}, expected usd - skipping.`);
      else if (amount !== tx.amountCents) console.error(`[stripe-webhook] ref ${ref} amount was ${amount}, expected ${tx.amountCents} - skipping.`);

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
                include: { listing: { include: { publisher: true } }, buyer: true },
              });
              const pub = full?.listing.publisher;
              // Use the same helper the wallet path uses, so a card-funded order
              // notifies BOTH the publisher and the admin desk. Previously this
              // branch told only the publisher, so admins missed card orders.
              if (pub) {
                await sendNewOrderEmails({
                  publisherEmail: pub.email,
                  domain: full!.listing.domain,
                  orderId: tx.orderId,
                  buyerName: full!.buyer?.name,
                });
              } else {
                console.error(`[stripe-webhook] order ${tx.orderId} has no publisher - no order emails sent.`);
              }
            }
          }
        } else if (tx.purpose === "topup") {
          // No deposit fee: the buyer is credited every cent they paid in.
          const net = netDeposit(tx.amountCents);
          const fee = tx.amountCents - net;
          await prisma.$transaction([
            prisma.user.update({ where: { id: tx.userId }, data: { balanceCents: { increment: net } } }),
            prisma.walletTx.create({
              data: {
                userId: tx.userId,
                kind: "topup",
                amountCents: net,
                method: "stripe",
                note: `Deposit ${tx.amountCents} cents, credited in full`,
              },
            }),
          ]);
          console.log(`[stripe-webhook] credited ${net} cents to user ${tx.userId}`);
          if (!emailEnabled()) {
            console.error("[stripe-webhook] email is off - deposit receipt and admin alert were not sent.");
          } else {
            const u = await prisma.user.findUnique({ where: { id: tx.userId } });
            if (!u) {
              console.error(`[stripe-webhook] user ${tx.userId} not found - no deposit emails sent.`);
            } else {
              await sendDepositReceipt(u.email, tx.amountCents, net);
              await sendDepositAdmin(u.email, tx.amountCents, net);
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
