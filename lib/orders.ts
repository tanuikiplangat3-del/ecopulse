// The order lifecycle: the turnaround deadline, and the one and only path that
// cancels a funded order and gives the buyer their money back.
//
// Statuses, in order:
//   pending_payment -> funded -> in_progress -> live -> completed
//                                      \-> cancelled
//
// WHO MAY CANCEL WHAT (decided 14 Sep 2026, and enforced in app/actions/orders.ts):
//   pending_payment  buyer or admin. No money has moved, so nothing is refunded.
//   funded / in_progress
//                    NOT the buyer. Once they have paid, the order is the
//                    publisher's to deliver or reject.
//                    - publisher rejects the guest post, with a reason
//                    - admin cancels, with a reason
//                    - this file's sweeper, when the turnaround runs out
//                    All three refund the held amount to the buyer's balance.
//   live / completed nobody. The link is up; disputes are handled by hand.

import { prisma } from "@/lib/prisma";

/** Statuses where the buyer's money is held and the publisher still owes work. */
export const ORDER_IN_FLIGHT = ["funded", "in_progress"] as const;

export const CANCELLED_BY_BUYER = "buyer";
export const CANCELLED_BY_PUBLISHER = "publisher";
export const CANCELLED_BY_ADMIN = "admin";
export const CANCELLED_BY_SYSTEM = "system";

/** The deadline for an order funded right now with this turnaround. */
export function dueAtFrom(turnaroundDays: number, from: Date = new Date()): Date {
  const days = Math.max(1, Math.round(turnaroundDays || 7));
  return new Date(from.getTime() + days * 86400_000);
}

/** Milliseconds left before the turnaround runs out. Negative once it has. */
export function msRemaining(dueAt: Date | null | undefined, now: Date = new Date()): number | null {
  if (!dueAt) return null;
  return new Date(dueAt).getTime() - now.getTime();
}

/** "3d 04h 12m" / "04h 12m" / "12m 30s". Used on the server for a first paint. */
export function formatRemaining(ms: number): string {
  const over = ms < 0;
  let s = Math.floor(Math.abs(ms) / 1000);
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const body =
    d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m`
    : h > 0 ? `${pad(h)}h ${pad(m)}m ${pad(s)}s`
    : `${pad(m)}m ${pad(s)}s`;
  return over ? `${body} overdue` : body;
}

export type CancelResult = {
  orderId: number;
  refundedCents: number;
  buyerId: number;
} | null;

/**
 * Cancel an in-flight order and put the held money back on the buyer's balance.
 *
 * Everything happens inside one transaction, and the status change is an
 * updateMany guarded on the order still being in flight. That guard is what
 * makes this safe to call twice: if the sweeper and an admin hit the same order
 * at the same moment, the second call updates nothing, refunds nothing and
 * returns null. Doing the refund first and the status second would pay a buyer
 * twice for one cancellation.
 *
 * Returns null when the order was not in flight - already cancelled, already
 * live, or never funded.
 */
export async function cancelFundedOrder(
  orderId: number,
  opts: { by: string; reason: string }
): Promise<CancelResult> {
  return prisma.$transaction(async (tx) => {
    // Read inside the transaction, before the guard, so refundedCents can be
    // stamped with the amount in the same write that closes the order.
    const existing = await tx.order.findUnique({ where: { id: orderId } });
    if (!existing) return null;

    const changed = await tx.order.updateMany({
      where: { id: orderId, status: { in: ORDER_IN_FLIGHT as unknown as string[] } },
      data: {
        status: "cancelled",
        cancelReason: opts.reason.slice(0, 1000),
        cancelledBy: opts.by,
        cancelledAt: new Date(),
        refundedCents: existing.amountCents,
        dueAt: null,
      },
    });
    if (changed.count === 0) return null;

    const order = existing;

    // The buyer gets the full amount they paid back as balance, whether they
    // originally paid from the wallet or by card. Card refunds are not reversed
    // through Stripe - deposits are final, and this is what "the balance that
    // was on hold goes back to the total balance" means.
    if (order.amountCents > 0) {
      await tx.user.update({
        where: { id: order.buyerId },
        data: { balanceCents: { increment: order.amountCents } },
      });
      await tx.walletTx.create({
        data: {
          userId: order.buyerId,
          kind: "refund",
          amountCents: order.amountCents,
          note: `Order #${orderId} cancelled (${opts.by})`,
        },
      });
    }

    return { orderId, refundedCents: order.amountCents, buyerId: order.buyerId };
  });
}
