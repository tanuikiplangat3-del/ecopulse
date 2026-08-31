"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { centsFromUsd, money, MIN_TOPUP_CENTS } from "@/lib/money";
import { createCheckout, stripeEnabled } from "@/lib/stripe";

const q = (s: string) => encodeURIComponent(s);

export async function startTopupAction(formData: FormData) {
  const user = await requireRole("buyer");
  const amountUsd = parseFloat(String(formData.get("amount") || "0"));
  if (!amountUsd || centsFromUsd(amountUsd) < MIN_TOPUP_CENTS)
    redirect(`/topup?error=${q("The minimum deposit is " + money(MIN_TOPUP_CENTS) + ".")}`);
  if (!stripeEnabled()) redirect(`/topup?error=${q("Card top-ups are unavailable right now. Please contact support.")}`);

  const cents = centsFromUsd(amountUsd);
  const ref = "top_" + randomBytes(10).toString("hex");
  await prisma.stripeTx.create({
    data: { ref, userId: user.id, purpose: "topup", orderId: 0, amountCents: cents, status: "pending" },
  });
  const url = await createCheckout({
    amountCents: cents,
    label: `Wallet top-up ($${amountUsd.toFixed(2)})`,
    purpose: "topup",
    ref,
    customerEmail: user.email,
  });
  redirect(url);
}
