import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { StatusBadge, Flash } from "@/components/ui";
import { payFromWalletAction, payWithStripeAction, submitLiveAction, confirmLiveAction, cancelOrderAction, confirmReceiptAction } from "@/app/actions/orders";
import { stripeEnabled } from "@/lib/stripe";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireUser();
  const id = parseInt(params.id);
  const order = await prisma.order.findUnique({
    where: { id },
    include: { listing: { include: { publisher: true } }, buyer: true },
  });
  if (!order) redirect("/orders");

  const isBuyer = order!.buyerId === user.id;
  const isPublisher = order!.listing.publisherId === user.id;
  const isAdmin = user.role === "admin";
  if (!isBuyer && !isPublisher && !isAdmin) redirect("/orders");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/orders" className="muted text-sm">← All orders</Link>
      <div className="mb-6 mt-2 flex items-center justify-between">
        <h1 className="h2">Order #{order!.id}</h1>
        <StatusBadge status={order!.status} />
      </div>
      <Flash searchParams={searchParams} />

      <div className="card mb-5">
        <h2 className="h3 mb-3">Details</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Info label="Site" value={order!.listing.domain} />
          <Info label={isPublisher ? "Your payout" : "Amount"} value={money(isPublisher ? order!.payoutCents : order!.amountCents)} />
          <Info label="Target URL" value={order!.targetUrl || "-"} />
          <Info label="Anchor text" value={order!.anchorText || "-"} />
          <Info label="Turnaround" value={`${order!.turnaroundDays} days`} />
          {order!.liveUrl && <Info label="Live URL" value={order!.liveUrl} />}
          {isAdmin && <Info label="Buyer" value={order!.buyer.name} />}
          {isAdmin && <Info label="Publisher" value={order!.listing.publisher.name} />}
        </dl>

        {(order!.articleDocUrl || order!.featuredImage) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {order!.articleDocUrl && (
              <a
                href={order!.articleDocUrl}
                download={order!.articleDocName || "guest-post-document"}
                className="btn-ghost btn-sm"
              >
                ⬇ Download document{order!.articleDocName ? ` (${order!.articleDocName})` : ""}
              </a>
            )}
            {order!.featuredImage && (
              <a href={order!.featuredImage} download="featured-image" className="btn-ghost btn-sm">
                ⬇ Download featured image
              </a>
            )}
          </div>
        )}

        {order!.articleContent && (
          <div className="mt-4">
            <p className="muted text-xs">Article / instructions</p>
            <p className="whitespace-pre-wrap text-sm text-white/80">{order!.articleContent}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {isBuyer && order!.status === "pending_payment" && (
        <div className="card">
          <h2 className="h3 mb-3">Pay to fund this order</h2>
          <p className="muted mb-4 text-sm">Funds are held until the link is live. You pay {money(order!.amountCents)}.</p>
          <div className="flex flex-wrap gap-3">
            <form action={payWithStripeAction}>
              <input type="hidden" name="orderId" value={order!.id} />
              <button className="btn-primary" type="submit" disabled={!stripeEnabled()}>Pay by card</button>
            </form>
            <form action={payFromWalletAction}>
              <input type="hidden" name="orderId" value={order!.id} />
              <button className="btn-ghost" type="submit">Pay from wallet ({money(user.balanceCents)})</button>
            </form>
            <form action={cancelOrderAction}>
              <input type="hidden" name="orderId" value={order!.id} />
              <button className="btn-danger" type="submit">Cancel</button>
            </form>
          </div>
          {!stripeEnabled() && <p className="muted mt-3 text-xs">Please pay from your wallet balance.</p>}
        </div>
      )}

      {isPublisher && order!.status === "funded" && (
        <div className="card">
          <h2 className="h3 mb-3">Confirm you received this order</h2>
          <p className="muted mb-4 text-sm">Confirm receipt to move this order into progress, then publish the link and submit the live URL.</p>
          <form action={confirmReceiptAction}>
            <input type="hidden" name="orderId" value={order!.id} />
            <button className="btn-primary" type="submit">Confirm receipt</button>
          </form>
        </div>
      )}

      {isPublisher && order!.status === "in_progress" && (
        <div className="card">
          <h2 className="h3 mb-3">Submit the live link</h2>
          <form action={submitLiveAction}>
            <input type="hidden" name="orderId" value={order!.id} />
            <label className="field">
              <span>Live URL where the link is published</span>
              <input className="input" name="liveUrl" placeholder="https://yoursite.com/the-post" required />
            </label>
            <button className="btn-primary" type="submit">Submit live URL</button>
          </form>
        </div>
      )}

      {isBuyer && order!.status === "live" && (
        <div className="card">
          <h2 className="h3 mb-3">Confirm the link is live</h2>
          <p className="muted mb-4 text-sm">Check {order!.liveUrl} and confirm to complete the order.</p>
          <form action={confirmLiveAction}>
            <input type="hidden" name="orderId" value={order!.id} />
            <button className="btn-primary" type="submit">Confirm &amp; complete</button>
          </form>
        </div>
      )}

      {order!.status === "completed" && (
        <div className="card flash-success">This order is complete{order!.publisherPaid ? " and the publisher has been paid." : "."}</div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="muted text-xs">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
