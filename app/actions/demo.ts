"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { centsFromUsd, MARKUP_INVITED, MARKUP_TIERED } from "@/lib/money";
import { passwordProblem } from "@/lib/password";
import { authorityScoreFor, AUTHORITY_DA, AUTHORITY_DR } from "@/lib/authority";
import {
  DEMO_BALANCE_CENTS,
  DEMO_BUYER_EMAIL,
  DEMO_PUBLISHER_EMAIL,
  DEMO_SITES,
} from "@/lib/demo";

const q = (s: string) => encodeURIComponent(s);
const back = "/admin/users";

/**
 * Create the demo buyer, the demo publisher and the five demo websites, or
 * reset them back to a clean state.
 *
 * Safe to run repeatedly. Demo listings are deleted and rebuilt each time, so a
 * demo that has been clicked around in goes back to exactly the state a
 * walkthrough expects. The accounts themselves are kept and updated rather than
 * deleted, because Listing and Order cascade off User and a delete would take
 * any demo orders with it.
 *
 * The password never travels through chat: an admin types it into the form on
 * Admin -> Users.
 */
export async function resetDemoDataAction(formData: FormData) {
  await requireRole("admin");
  const password = String(formData.get("demoPassword") || "");
  const problem = passwordProblem(password);
  if (problem) redirect(`${back}?error=${q("Demo password: " + problem)}`);

  const passwordHash = await hashPassword(password);

  // Refuse if either address is held by a real account. upsert would otherwise
  // overwrite a real person's password, role and balance without a word.
  const clashes = await prisma.user.findMany({
    where: { email: { in: [DEMO_BUYER_EMAIL, DEMO_PUBLISHER_EMAIL] }, isDemo: false },
    select: { email: true },
  });
  if (clashes.length > 0) {
    redirect(
      `${back}?error=${q(
        `A real account already uses ${clashes.map((c) => c.email).join(" and ")}. Rename or delete it first, or the demo reset would overwrite it.`
      )}`
    );
  }

  // The buyer first: the publisher is attributed to them, so their id is needed
  // before the publisher row is written.
  const buyer = await prisma.user.upsert({
    where: { email: DEMO_BUYER_EMAIL },
    update: {
      name: "Demo Buyer",
      passwordHash,
      role: "buyer",
      verified: true,
      isDemo: true,
      balanceCents: DEMO_BALANCE_CENTS,
    },
    create: {
      name: "Demo Buyer",
      email: DEMO_BUYER_EMAIL,
      passwordHash,
      role: "buyer",
      verified: true,
      isDemo: true,
      balanceCents: DEMO_BALANCE_CENTS,
    },
  });

  const publisher = await prisma.user.upsert({
    where: { email: DEMO_PUBLISHER_EMAIL },
    update: {
      name: "Demo Publisher",
      passwordHash,
      role: "publisher",
      verified: true,
      isDemo: true,
      tuesdayAgreed: true,
      // Attributed to the demo buyer, so anything this account lists during a
      // walkthrough prices the same way the two seeded sites do.
      invitedByBuyerId: buyer.id,
      payMethod: "paypal",
      payPaypal: DEMO_PUBLISHER_EMAIL,
    },
    create: {
      name: "Demo Publisher",
      email: DEMO_PUBLISHER_EMAIL,
      passwordHash,
      role: "publisher",
      verified: true,
      isDemo: true,
      tuesdayAgreed: true,
      invitedByBuyerId: buyer.id,
      payMethod: "paypal",
      payPaypal: DEMO_PUBLISHER_EMAIL,
    },
  });

  // Rebuild the inventory. Only listings with no orders can be removed, for the
  // usual reason: Listing -> Order cascades and would destroy payment history.
  // Anything with a demo order on it is archived out of the way instead.
  const withOrders = await prisma.listing.findMany({
    where: { isDemo: true, orders: { some: {} } },
    select: { id: true },
  });
  const keepIds = withOrders.map((l) => l.id);
  if (keepIds.length > 0) {
    await prisma.listing.updateMany({
      where: { id: { in: keepIds } },
      data: { status: "archived" },
    });
  }
  await prisma.listing.deleteMany({ where: { isDemo: true, id: { notIn: keepIds } } });

  for (const site of DEMO_SITES) {
    const authority = {
      authorityType: site.da ? AUTHORITY_DA : AUTHORITY_DR,
      domainRating: site.dr,
      domainAuthority: site.da || 0,
    };
    await prisma.listing.create({
      data: {
        publisherId: publisher.id,
        domain: site.domain,
        url: `https://${site.domain}`,
        category: site.category,
        country: site.country,
        language: "English",
        domainRating: site.dr,
        monthlyTraffic: site.traffic,
        metricsUpdatedAt: new Date(),
        authorityType: authority.authorityType,
        domainAuthority: authority.domainAuthority,
        authorityScore: authorityScoreFor(authority),
        // Two of the five carry the demo buyer's rate. The other three price
        // normally, and one of those matches an invited site penny for penny so
        // the difference shows up on screen.
        markupModel: site.invited ? MARKUP_INVITED : MARKUP_TIERED,
        requestedById: site.invited ? buyer.id : null,
        linkType: "guest_post",
        priceCents: centsFromUsd(site.priceUsd),
        tatDays: site.tatDays,
        description: site.description,
        status: "approved",
        isDemo: true,
      },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/marketplace");
  redirect(
    `${back}?success=${q(
      `Demo ready. Sign in as ${DEMO_BUYER_EMAIL} or ${DEMO_PUBLISHER_EMAIL} with the password you just set. ${DEMO_SITES.length} demo websites rebuilt` +
        (keepIds.length ? `, and ${keepIds.length} older demo site(s) with orders on them were archived.` : ".")
    )}`
  );
}
