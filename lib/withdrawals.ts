// Publisher withdrawals: what a publisher can ask to be paid, and the one
// definition of it that the dashboard, the Withdraw page and the server action
// all share, so the number on screen is always the number that gets requested.
//
// A payout is READY TO WITHDRAW when the order is completed (the buyer, or an
// admin on their behalf, confirmed the link is live), it has not been paid, and
// it is not already part of a withdrawal request. A link that is live but not
// yet confirmed is shown separately as "awaiting confirmation" and cannot be
// withdrawn: until someone confirms it, we do not know the placement is real.

import { prisma } from "@/lib/prisma";

export const WITHDRAWAL_PENDING = "pending";
export const WITHDRAWAL_PAID = "paid";
export const WITHDRAWAL_REJECTED = "rejected";

export const WITHDRAW_METHODS = [
  { value: "paypal", label: "PayPal" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank transfer" },
  { value: "other", label: "Something else" },
];

export function withdrawMethodLabel(v: string): string {
  return WITHDRAW_METHODS.find((m) => m.value === v)?.label || v;
}

/** Prisma filter for the orders a publisher can withdraw right now. */
export function readyToWithdrawWhere(publisherId: number) {
  return {
    listing: { publisherId },
    status: "completed",
    publisherPaid: false,
    withdrawalId: null,
  };
}

export type PublisherBalance = {
  readyCents: number;       // completed, unpaid, not in a request
  readyCount: number;
  awaitingCents: number;    // live, waiting for the buyer to confirm
  inReviewCents: number;    // in a pending withdrawal request
  receivedCents: number;    // already paid
  pending: { id: number; amountCents: number; createdAt: Date } | null;
};

export async function publisherBalance(publisherId: number): Promise<PublisherBalance> {
  const [ready, awaiting, paid, pending] = await Promise.all([
    prisma.order.aggregate({ _sum: { payoutCents: true }, _count: true, where: readyToWithdrawWhere(publisherId) }),
    prisma.order.aggregate({
      _sum: { payoutCents: true },
      where: { listing: { publisherId }, status: "live", publisherPaid: false },
    }),
    prisma.order.aggregate({ _sum: { payoutCents: true }, where: { listing: { publisherId }, publisherPaid: true } }),
    prisma.withdrawal.findFirst({
      where: { publisherId, status: WITHDRAWAL_PENDING },
      select: { id: true, amountCents: true, createdAt: true },
    }),
  ]);
  return {
    readyCents: ready._sum.payoutCents || 0,
    readyCount: ready._count || 0,
    awaitingCents: awaiting._sum.payoutCents || 0,
    inReviewCents: pending?.amountCents || 0,
    receivedCents: paid._sum.payoutCents || 0,
    pending: pending || null,
  };
}

/** The saved details for a method, used to prefill the Withdraw form. */
export function savedDetailsFor(u: any, method: string): string {
  if (method === "paypal") return u?.payPaypal || "";
  if (method === "mpesa") return u?.payMpesa || "";
  if (method === "bank") return u?.payBank || "";
  return u?.payCard || "";
}
