// Marketplace paywall.
//
// Everyone sees the first FREE_PREVIEW_COUNT listings in full. Beyond that the
// listings are locked until the buyer has deposited UNLOCK_DEPOSIT_CENTS or more.
//
// FOUNDING BUYERS are the exception: the first ten buyers ever to register are
// unlocked permanently without depositing anything. See lib/founders.ts.
//
// IMPORTANT: locked listings are redacted on the SERVER, in maskListing() below.
// A CSS blur on its own is decorative - the real domain would still sit in the
// page source for anyone who opened developer tools. Locked rows are sent to the
// browser with the identifying fields already replaced.

import { prisma } from "@/lib/prisma";
import { UNLOCK_DEPOSIT_CENTS, FREE_PREVIEW_COUNT } from "@/lib/money";

export { FREE_PREVIEW_COUNT };

/**
 * Total a user has paid in, in cents. Measured from successful Stripe top-ups
 * (the gross amount charged) rather than the wallet balance, so that spending
 * the balance afterwards never re-locks the marketplace.
 *
 * Simulated credits count too. A simulated account is meant to behave exactly
 * like a paying buyer, and leaving them out would blur its own marketplace the
 * moment it had more than FREE_PREVIEW_COUNT sites to look at. They are still
 * reported separately everywhere money is totalled - see lib/simulated.ts.
 */
export async function totalDepositedCents(userId: number): Promise<number> {
  const [card, simulated] = await Promise.all([
    prisma.stripeTx.aggregate({
      where: { userId, purpose: "topup", status: "success" },
      _sum: { amountCents: true },
    }),
    prisma.simulatedCredit.aggregate({ where: { userId }, _sum: { grossCents: true } }),
  ]);
  return (card._sum.amountCents || 0) + (simulated._sum.grossCents || 0);
}

export type Viewer = {
  unlocked: boolean;      // may see every listing in full
  signedIn: boolean;
  depositedCents: number;
  shortfallCents: number; // how much more is needed to unlock
  founderNumber: number | null; // 1..10 for a founding buyer, else null
};

/** Work out what the current viewer is allowed to see. */
export async function getViewerAccess(
  user: { id: number; role: string; founderNumber?: number | null; isDemo?: boolean | null } | null
): Promise<Viewer> {
  // Publishers and admins are never paywalled - they run the marketplace.
  if (user && (user.role === "admin" || user.role === "publisher")) {
    return { unlocked: true, signedIn: true, depositedCents: 0, shortfallCents: 0, founderNumber: null };
  }
  // Neither is a demo account. It has no Stripe deposits and never will, so
  // without this the demo starts blurring its own websites the moment there are
  // more than FREE_PREVIEW_COUNT of them.
  if (user?.isDemo) {
    return { unlocked: true, signedIn: true, depositedCents: 0, shortfallCents: 0, founderNumber: null };
  }
  if (!user) {
    return { unlocked: false, signedIn: false, depositedCents: 0, shortfallCents: UNLOCK_DEPOSIT_CENTS, founderNumber: null };
  }

  // Callers that already loaded the whole user pass it straight through; the
  // rest get one indexed lookup. `undefined` means "not loaded", null means
  // "loaded, and this buyer is not a founder" - they must not be confused.
  const founderNumber =
    user.founderNumber !== undefined
      ? user.founderNumber
      : (await prisma.user.findUnique({ where: { id: user.id }, select: { founderNumber: true } }))?.founderNumber ?? null;

  // A founding buyer is unlocked for life, without ever depositing. The deposit
  // total is still reported, because the wallet pages show it.
  const deposited = await totalDepositedCents(user.id);
  const unlocked = founderNumber !== null || deposited >= UNLOCK_DEPOSIT_CENTS;
  return {
    unlocked,
    signedIn: true,
    depositedCents: deposited,
    shortfallCents: unlocked ? 0 : UNLOCK_DEPOSIT_CENTS - deposited,
    founderNumber,
  };
}

/**
 * Replace everything that identifies a listing, leaving only enough shape for
 * the card to render at a realistic size behind its blur.
 */
export function maskListing<T extends Record<string, any>>(listing: T): T {
  return {
    ...listing,
    domain: "hidden-website.com",
    url: "",
    description: "",
    country: listing.country, // country stays - it is not identifying on its own
  };
}
