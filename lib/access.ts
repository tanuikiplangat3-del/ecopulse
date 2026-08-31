// Marketplace paywall.
//
// Everyone sees the first FREE_PREVIEW_COUNT listings in full. Beyond that the
// listings are locked until the buyer has deposited UNLOCK_DEPOSIT_CENTS or more.
//
// IMPORTANT: locked listings are redacted on the SERVER, in maskListing() below.
// A CSS blur on its own is decorative - the real domain would still sit in the
// page source for anyone who opened developer tools. Locked rows are sent to the
// browser with the identifying fields already replaced.

import { prisma } from "@/lib/prisma";
import { UNLOCK_DEPOSIT_CENTS, FREE_PREVIEW_COUNT } from "@/lib/money";

export { FREE_PREVIEW_COUNT };

/**
 * Total a user has actually paid in, in cents. Measured from successful Stripe
 * top-ups (the gross amount charged) rather than the wallet balance, so that
 * spending the balance afterwards never re-locks the marketplace.
 */
export async function totalDepositedCents(userId: number): Promise<number> {
  const agg = await prisma.stripeTx.aggregate({
    where: { userId, purpose: "topup", status: "success" },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents || 0;
}

export type Viewer = {
  unlocked: boolean;      // may see every listing in full
  signedIn: boolean;
  depositedCents: number;
  shortfallCents: number; // how much more is needed to unlock
};

/** Work out what the current viewer is allowed to see. */
export async function getViewerAccess(
  user: { id: number; role: string } | null
): Promise<Viewer> {
  // Publishers and admins are never paywalled - they run the marketplace.
  if (user && (user.role === "admin" || user.role === "publisher")) {
    return { unlocked: true, signedIn: true, depositedCents: 0, shortfallCents: 0 };
  }
  if (!user) {
    return { unlocked: false, signedIn: false, depositedCents: 0, shortfallCents: UNLOCK_DEPOSIT_CENTS };
  }
  const deposited = await totalDepositedCents(user.id);
  const unlocked = deposited >= UNLOCK_DEPOSIT_CENTS;
  return {
    unlocked,
    signedIn: true,
    depositedCents: deposited,
    shortfallCents: unlocked ? 0 : UNLOCK_DEPOSIT_CENTS - deposited,
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
