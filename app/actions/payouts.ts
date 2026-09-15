"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { emailEnabled, sendPayoutMethodDecision } from "@/lib/email";

const q = (s: string) => encodeURIComponent(s);
const back = "/admin/payouts";

/**
 * An admin answers a publisher who asked to be paid by something other than
 * PayPal.
 *
 * Approving does not change the details, only our word that we can send money
 * there. Declining leaves the details in place too, so the publisher can see
 * what was turned down and change one thing rather than start again.
 */
export async function decidePayoutMethodAction(formData: FormData) {
  await requireRole("admin");
  const userId = parseInt(String(formData.get("userId") || "0")) || 0;
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim();

  if (!["approve", "reject"].includes(decision)) redirect(`${back}?error=${q("Choose approve or decline.")}`);

  const user = await prisma.user.findFirst({ where: { id: userId, role: "publisher" } });
  if (!user) redirect(`${back}?error=${q("That publisher was not found.")}`);
  if (user!.payStatus !== "pending") redirect(`${back}?error=${q("That request has already been answered.")}`);

  const approved = decision === "approve";
  await prisma.user.update({
    where: { id: userId },
    data: { payStatus: approved ? "approved" : "rejected", payNote: note || null },
  });

  if (emailEnabled()) {
    try {
      await sendPayoutMethodDecision({
        to: user!.email,
        approved,
        method: user!.payMethod || "that method",
        note,
      });
    } catch (e: any) {
      // The decision is recorded either way - never lose it to a mail failure.
      console.error(`[payouts] could not email the payout decision to ${user!.email}: ${e?.message || e}`);
    }
  }

  revalidatePath(back);
  redirect(
    `${back}?success=${q(
      approved
        ? `${user!.name} can be paid by ${user!.payMethod}. They have been told.`
        : `${user!.name} was told we cannot pay by ${user!.payMethod}.`
    )}`
  );
}
