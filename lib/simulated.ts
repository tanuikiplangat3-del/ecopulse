// Simulated buyer accounts.
//
// These are ordinary buyer accounts. They sign in, see the real marketplace,
// place real orders, and the publishers behind those orders are paid in real
// money. The one difference is where the balance came from: an admin credited
// it, no card was charged, and so that money never existed.
//
// Everything here exists to keep those two kinds of money apart. A simulated
// deposit must never be added to real revenue, and the cash that actually left
// the business - the publisher payouts - must be visible on its own.
//
// The 5% service fee is applied exactly as it is on a card deposit, so a
// simulated account behaves the same way a real one does: credit $1,000 and the
// balance reads $950.

import { prisma } from "@/lib/prisma";
import { depositFee } from "@/lib/money";

/** Orders that represent real spending. A cancelled order was refunded. */
const REAL_ORDERS = { not: "cancelled" };

/**
 * Stripe's own cost on a card deposit, roughly 2.9% + $0.30. Not charged here,
 * which is the point: it is the one figure in the report that is genuinely cash
 * saved rather than money moved from one internal pocket to another.
 */
function cardCostCents(grossCents: number): number {
  return Math.round(grossCents * 0.029) + 30;
}

export type SimulatedAccountRow = {
  id: number;
  name: string;
  email: string;
  balanceCents: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
  orders: number;
  buyerValueCents: number;
  publisherCostCents: number;
  publisherPaidCents: number;
  createdAt: Date;
};

export type SimulatedReport = {
  rows: SimulatedAccountRow[];
  accounts: number;
  grossCents: number;        // credited, before the service fee
  feeCents: number;          // service fee withheld
  netCents: number;          // what landed on the balances
  balanceLeftCents: number;  // still unspent
  orders: number;
  buyerValueCents: number;      // what these orders would have cost a real buyer
  publisherCostCents: number;   // real money owed to publishers
  publisherPaidCents: number;   // real money already sent
  publisherOwedCents: number;   // real money still to send
  marginCents: number;          // buyer value minus publisher cost - never real revenue
  cardCostAvoidedCents: number; // the card processing we did not pay
};

/** Everything Admin -> Simulated accounts needs, in one place. */
export async function simulatedReport(): Promise<SimulatedReport> {
  const users = await prisma.user.findMany({
    where: { isSimulated: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, balanceCents: true, createdAt: true },
  });

  const ids = users.map((u) => u.id);
  const empty: SimulatedReport = {
    rows: [],
    accounts: 0,
    grossCents: 0,
    feeCents: 0,
    netCents: 0,
    balanceLeftCents: 0,
    orders: 0,
    buyerValueCents: 0,
    publisherCostCents: 0,
    publisherPaidCents: 0,
    publisherOwedCents: 0,
    marginCents: 0,
    cardCostAvoidedCents: 0,
  };
  if (ids.length === 0) return empty;

  const [credits, orders] = await Promise.all([
    prisma.simulatedCredit.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, grossCents: true, feeCents: true, netCents: true },
    }),
    prisma.order.findMany({
      where: { buyerId: { in: ids }, status: REAL_ORDERS },
      select: { buyerId: true, amountCents: true, payoutCents: true, publisherPaid: true },
    }),
  ]);

  const rows: SimulatedAccountRow[] = users.map((u) => {
    const mine = credits.filter((c) => c.userId === u.id);
    const myOrders = orders.filter((o) => o.buyerId === u.id);
    return {
      ...u,
      grossCents: mine.reduce((s, c) => s + c.grossCents, 0),
      feeCents: mine.reduce((s, c) => s + c.feeCents, 0),
      netCents: mine.reduce((s, c) => s + c.netCents, 0),
      orders: myOrders.length,
      buyerValueCents: myOrders.reduce((s, o) => s + o.amountCents, 0),
      publisherCostCents: myOrders.reduce((s, o) => s + o.payoutCents, 0),
      publisherPaidCents: myOrders.filter((o) => o.publisherPaid).reduce((s, o) => s + o.payoutCents, 0),
    };
  });

  const sum = (pick: (r: SimulatedAccountRow) => number) => rows.reduce((s, r) => s + pick(r), 0);
  const publisherCostCents = sum((r) => r.publisherCostCents);
  const publisherPaidCents = sum((r) => r.publisherPaidCents);
  const buyerValueCents = sum((r) => r.buyerValueCents);

  return {
    rows,
    accounts: rows.length,
    grossCents: sum((r) => r.grossCents),
    feeCents: sum((r) => r.feeCents),
    netCents: sum((r) => r.netCents),
    balanceLeftCents: sum((r) => r.balanceCents),
    orders: sum((r) => r.orders),
    buyerValueCents,
    publisherCostCents,
    publisherPaidCents,
    publisherOwedCents: publisherCostCents - publisherPaidCents,
    marginCents: buyerValueCents - publisherCostCents,
    cardCostAvoidedCents: credits.reduce((s, c) => s + cardCostCents(c.grossCents), 0),
  };
}

/** Split a credit the same way a card deposit is split. */
export function splitCredit(grossCents: number): { grossCents: number; feeCents: number; netCents: number } {
  const feeCents = depositFee(grossCents);
  return { grossCents, feeCents, netCents: grossCents - feeCents };
}
