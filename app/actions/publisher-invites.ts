"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { appUrl } from "@/lib/stripe";
import { emailEnabled, sendPublisherInviteFromBuyer, sendBuyerTheirPublisherLink } from "@/lib/email";
import { INVITE_DAYS, MAX_OPEN_INVITES, MAX_TOTAL_INVITES } from "@/lib/invites";

const q = (s: string) => encodeURIComponent(s);
const back = "/request-site";

/**
 * A buyer creates a publisher sign-up link.
 *
 * The whole point is that it is instant and takes one field. The buyer has
 * already done the negotiating; we are not re-collecting the price, the VAT or
 * the payout details, because the publisher sets all of that themselves when
 * they list. Whoever registers through this link is attributed to this buyer,
 * so the buyer pays half our margin on their first 3 orders on each site that
 * publisher lists.
 */
export async function createPublisherInviteAction(formData: FormData) {
  const user = await requireRole("buyer");
  const email = String(formData.get("publisherEmail") || "").trim().toLowerCase();
  const name = String(formData.get("publisherName") || "").trim();
  const site = String(formData.get("site") || "").trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect(`${back}?error=${q("Enter the publisher's email address, for example jane@konemedia.co.ke")}`);
  }
  if (email === user.email.trim().toLowerCase()) {
    redirect(`${back}?error=${q("That is your own email address. The link is for the publisher you negotiated with.")}`);
  }

  // Already on the platform. One message for every case: three different
  // answers would turn this box into a way of probing any address to learn
  // whether it has an account here and whether it is a publisher.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(
      `${back}?error=${q(
        "We could not create a link for that address. If they already have a Link Tomorrow account they can sign in instead."
      )}`
    );
  }

  // Reuse rather than pile up: asking again for the same publisher replaces the
  // old link instead of leaving two live tokens for one person. Scoped to links
  // this buyer made from THIS page - siteRequestId is null on those - so it can
  // never quietly kill a link an admin generated from a site request.
  await prisma.invite.deleteMany({
    where: { requestedById: user.id, email, acceptedAt: null, siteRequestId: null },
  });

  const mine = { requestedById: user.id, siteRequestId: null };
  const [open, total] = await Promise.all([
    prisma.invite.count({ where: { ...mine, acceptedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.invite.count({ where: mine }),
  ]);
  if (total >= MAX_TOTAL_INVITES) {
    redirect(
      `${back}?error=${q(
        `You have created ${MAX_TOTAL_INVITES} publisher links, which is the limit on this page. Email hello@welcometomorrow.io if you need more.`
      )}`
    );
  }
  if (open >= MAX_OPEN_INVITES) {
    redirect(
      `${back}?error=${q(
        `You have ${MAX_OPEN_INVITES} links waiting to be used. Cancel one you no longer need, or wait for a publisher to sign up, before creating another.`
      )}`
    );
  }

  const token = randomBytes(24).toString("hex");
  const created = await prisma.invite.create({
    data: {
      email,
      token,
      role: "publisher",
      requestedById: user.id,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 86400_000),
    },
  });

  // Counting and then creating is two round trips, so a burst of simultaneous
  // submissions could all pass the check above. Re-count afterwards and undo
  // this one if it turns out to be over the line. There is no unique key that
  // could enforce a "at most N rows" rule, so the check has to be after the
  // fact.
  const nowTotal = await prisma.invite.count({ where: mine });
  if (nowTotal > MAX_TOTAL_INVITES) {
    await prisma.invite.deleteMany({ where: { id: created.id } });
    redirect(`${back}?error=${q("You have reached the limit on publisher links. Email hello@welcometomorrow.io if you need more.")}`);
  }

  const link = `${appUrl()}/accept-invite?token=${token}`;

  // A demo walkthrough must not put real mail in a stranger's inbox. The link
  // still appears on screen, which is all a demo needs.
  // The link is on screen either way, so a mail failure must never lose it.
  if (emailEnabled() && !user.isDemo) {
    try {
      await sendPublisherInviteFromBuyer({
        publisherEmail: email,
        publisherName: name,
        buyerName: user.name,
        site,
        link,
      });
      await sendBuyerTheirPublisherLink({
        buyerEmail: user.email,
        buyerName: user.name,
        publisherEmail: email,
        publisherName: name || null,
        site: site || null,
        link,
      });
    } catch (e: any) {
      console.error(`[invites] could not email the publisher link for buyer ${user.id}: ${e?.message || e}`);
    }
  }

  revalidatePath(back);
  redirect(
    `${back}?success=${q(
      user.isDemo
        ? `Link ready for ${email}. It is below to copy.`
        : `Link ready for ${email}. We have emailed it to them and to you, and it is below to copy too.`
    )}`
  );
}

/** A buyer cancels one of their own links that nobody has used yet. */
export async function cancelPublisherInviteAction(formData: FormData) {
  const user = await requireRole("buyer");
  const id = parseInt(String(formData.get("id") || "0")) || 0;
  // Scoped to this buyer and to unused links, so posting the form by hand
  // cannot cancel somebody else's or undo a publisher who already joined.
  // Scoped to this buyer, to unused links, and to links made on this page
  // (siteRequestId null), so posting the form by hand cannot cancel someone
  // else's link, undo a publisher who already joined, or delete a link an admin
  // generated from a site request.
  const res = await prisma.invite.deleteMany({
    where: { id, requestedById: user.id, acceptedAt: null, siteRequestId: null },
  });
  revalidatePath(back);
  redirect(
    res.count > 0
      ? `${back}?success=${q("Link cancelled. It will no longer work.")}`
      : `${back}?error=${q("That link has already been used or does not exist.")}`
  );
}
