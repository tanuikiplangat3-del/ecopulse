// Founding buyers: the first FOUNDER_BUYER_LIMIT buyers ever to register see
// the whole marketplace with no deposit, for life.
//
// The slot number is STORED on the user rather than worked out on the fly from
// createdAt. Two reasons: deleting a buyer must not silently promote buyer 11
// into the group, and a buyer must never lose access because someone older
// signed up on a different device a second earlier. Once granted, it is theirs.
//
// `founderNumber` is @unique in the schema, and that constraint is what
// actually stops two simultaneous signups taking the same slot. claimFounderSlot
// proposes the lowest free number; if the database refuses it, another signup
// won the race, so it re-reads and takes the next free one.
//
// THE UNIQUE INDEX IS LOAD-BEARING. It is created by hand-written SQL, not by a
// Prisma migration. Without it two simultaneous signups can both be given the
// same number.

import { prisma } from "@/lib/prisma";
import { FOUNDER_BUYER_LIMIT } from "@/lib/money";

export { FOUNDER_BUYER_LIMIT };

/** How many of the founding slots are gone. */
export async function foundersTaken(): Promise<number> {
  return prisma.user.count({ where: { founderNumber: { not: null } } });
}

/** How many founding slots are still available. */
export async function founderSlotsLeft(): Promise<number> {
  return Math.max(0, FOUNDER_BUYER_LIMIT - (await foundersTaken()));
}

/**
 * Give this user the lowest free founding slot, if there is one left.
 *
 * Returns the slot number granted, or null when the ten are gone or this user
 * already has one. Never throws: a buyer's signup must not fail because a perk
 * could not be awarded.
 *
 * It reads the numbers actually in use rather than counting them. A count would
 * be wrong the moment there is a gap - delete founder #3 and the count is 4
 * forever, so every later signup would propose 5, collide, re-count 4, propose
 * 5 again, and spin until it gave up. Nobody would get a slot again, with
 * #3 and #6-#10 all sitting free.
 */
export async function claimFounderSlot(userId: number): Promise<number | null> {
  try {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { founderNumber: true } });
    if (!me || me.founderNumber !== null) return me?.founderNumber ?? null;

    // At most one attempt per slot: each failure rules out one number, and the
    // next pass skips it because it is now in the taken set.
    for (let attempt = 0; attempt < FOUNDER_BUYER_LIMIT; attempt++) {
      const rows = await prisma.user.findMany({
        where: { founderNumber: { not: null } },
        select: { founderNumber: true },
      });
      const taken = new Set(rows.map((r) => r.founderNumber as number));

      // "Is there a free number in 1..10", not "are there fewer than 10 rows".
      // A stray number above the limit - a mistyped backfill, say - would
      // otherwise make the slots look full while real ones sat unused.
      let next = 0;
      for (let n = 1; n <= FOUNDER_BUYER_LIMIT; n++) {
        if (!taken.has(n)) { next = n; break; }
      }
      if (!next) return null;

      try {
        await prisma.user.update({ where: { id: userId }, data: { founderNumber: next } });
        return next;
      } catch (e: any) {
        // P2002 = the unique index refused it, because another signup took this
        // number in the same instant. Re-read and take the next free one.
        if (e?.code === "P2002") continue;
        throw e;
      }
    }
    return null;
  } catch (e: any) {
    console.error(`[founders] could not award a founding slot to user ${userId}: ${e?.message || e}`);
    return null;
  }
}
