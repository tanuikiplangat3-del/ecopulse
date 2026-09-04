"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/money";
import {
  STATUS_CONFLICT,
  STATUS_REPLACED,
  LIVE_STATUS,
  liveRivalFor,
  pendingConflicts,
} from "@/lib/duplicates";
import { emailEnabled, sendListingConflictDecision } from "@/lib/email";

const q = (s: string) => encodeURIComponent(s);
const BACK = "/admin/conflicts";

/**
 * Keep what is already on the marketplace and turn the newcomer away.
 * The rejected listing keeps its record, so the publisher can see the outcome.
 */
export async function keepCurrentListingAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  const incoming = await prisma.listing.findUnique({
    where: { id },
    include: { publisher: true },
  });
  if (!incoming || incoming.status !== STATUS_CONFLICT)
    redirect(`${BACK}?error=${q("That listing is no longer awaiting a decision.")}`);

  const rival = await liveRivalFor(incoming!.domain);

  await prisma.listing.update({ where: { id }, data: { status: "rejected" } });

  if (emailEnabled() && incoming!.publisher?.email) {
    await sendListingConflictDecision({
      to: incoming!.publisher.email,
      domain: incoming!.domain,
      kept: false,
      theirPriceCents: incoming!.priceCents,
      livePriceCents: rival?.priceCents ?? null,
    });
  }

  revalidatePath(BACK);
  revalidatePath("/admin/listings");
  redirect(
    `${BACK}?success=${q(
      `Kept the existing listing for ${incoming!.domain}. ${incoming!.publisher?.name || "The publisher"} was told we already have a better price.`
    )}`
  );
}

/**
 * Publish the newcomer and take the current listing off the marketplace.
 * The old listing is archived, never deleted - its order history must survive.
 */
export async function switchToNewListingAction(formData: FormData) {
  await requireRole("admin");
  const id = parseInt(String(formData.get("id") || "0"));
  const incoming = await prisma.listing.findUnique({
    where: { id },
    include: { publisher: true },
  });
  if (!incoming || incoming.status !== STATUS_CONFLICT)
    redirect(`${BACK}?error=${q("That listing is no longer awaiting a decision.")}`);

  // Everything currently live on this domain steps aside.
  const replaced = await prisma.listing.updateMany({
    where: { domain: incoming!.domain, status: LIVE_STATUS },
    data: { status: STATUS_REPLACED },
  });
  await prisma.listing.update({ where: { id }, data: { status: LIVE_STATUS } });

  if (emailEnabled() && incoming!.publisher?.email) {
    await sendListingConflictDecision({
      to: incoming!.publisher.email,
      domain: incoming!.domain,
      kept: true,
      theirPriceCents: incoming!.priceCents,
      livePriceCents: null,
    });
  }

  console.log(
    `[conflicts] ${incoming!.domain}: switched to listing ${id}, replaced ${replaced.count} live listing(s)`
  );

  revalidatePath(BACK);
  revalidatePath("/admin/listings");
  revalidatePath("/marketplace");
  redirect(
    `${BACK}?success=${q(
      `${incoming!.domain} switched to the new listing at ${money(incoming!.priceCents)}. ${replaced.count} previous listing(s) removed from the marketplace.`
    )}`
  );
}

/**
 * Settle every open conflict in one press by keeping whichever listing is
 * cheaper for us. Built for bulk uploads, where reviewing forty clashes one at a
 * time is not a good use of anyone's morning.
 */
export async function resolveAllCheapestAction() {
  await requireRole("admin");
  const conflicts = await pendingConflicts();
  if (conflicts.length === 0)
    redirect(`${BACK}?error=${q("There are no conflicts to resolve.")}`);

  let switched = 0;
  let keptCurrent = 0;

  for (const incoming of conflicts) {
    const rival = await liveRivalFor(incoming.domain);

    // No live rival any more (it was resolved another way) - just publish it.
    if (!rival) {
      await prisma.listing.update({ where: { id: incoming.id }, data: { status: LIVE_STATUS } });
      switched++;
      continue;
    }

    if (incoming.priceCents < rival.priceCents) {
      await prisma.listing.updateMany({
        where: { domain: incoming.domain, status: LIVE_STATUS },
        data: { status: STATUS_REPLACED },
      });
      await prisma.listing.update({ where: { id: incoming.id }, data: { status: LIVE_STATUS } });
      switched++;
    } else {
      await prisma.listing.update({ where: { id: incoming.id }, data: { status: "rejected" } });
      keptCurrent++;
    }
  }

  console.log(`[conflicts] bulk resolve: switched ${switched}, kept current ${keptCurrent}`);

  revalidatePath(BACK);
  revalidatePath("/admin/listings");
  revalidatePath("/marketplace");
  redirect(
    `${BACK}?success=${q(
      `${conflicts.length} conflict(s) settled by price. ${switched} switched to the cheaper new listing, ${keptCurrent} kept the existing one.`
    )}`
  );
}

