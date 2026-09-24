"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { emailEnabled, sendWithdrawalRequestAdmin, sendWithdrawalDecision } from "@/lib/email";
import {
  readyToWithdrawWhere,
  withdrawMethodLabel,
  WITHDRAW_METHODS,
  WITHDRAWAL_PAID,
  WITHDRAWAL_PENDING,
  WITHDRAWAL_REJECTED,
} from "@/lib/withdrawals";

const q = (s: string) => encodeURIComponent(s);

/**
 * A publisher presses Withdraw.
 *
 * Every payout that is ready right now goes into one request, together with the
 * payment details they confirmed on the form. One open request at a time: new
 * earnings wait for the next one, which keeps each request a fixed amount the
 * admin can pay in one go.
 */
export async function requestWithdrawalAction(formData: FormData) {
  const user = await requireRole("publisher");
  const method = String(formData.get("method") || "");
  const details = String(formData.get("details") || "").trim();
  const country = String(formData.get("country") || "").trim() || null;
  const back = "/withdraw";

  if (!WITHDRAW_METHODS.some((m) => m.value === method)) redirect(`${back}?error=${q("Choose how you would like to be paid.")}`);
  if (details.length < 4) redirect(`${back}?error=${q("Enter the payment details for the method you chose.")}`);
  if (method === "paypal" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(details))
    redirect(`${back}?error=${q("Enter a valid PayPal email address.")}`);

  const result = await prisma.$transaction(async (tx) => {
    const open = await tx.withdrawal.findFirst({ where: { publisherId: user.id, status: WITHDRAWAL_PENDING } });
    if (open) return { error: "You already have a withdrawal waiting for approval. You can ask again once it is answered." };

    const orders = await tx.order.findMany({ where: readyToWithdrawWhere(user.id), select: { id: true, payoutCents: true } });
    const amount = orders.reduce((s, o) => s + o.payoutCents, 0);
    if (orders.length === 0 || amount <= 0) return { error: "There is nothing ready to withdraw yet." };

    const w = await tx.withdrawal.create({
      data: { publisherId: user.id, amountCents: amount, method, details, country },
    });
    // Only claim orders still unclaimed, and check we got every one of them, so
    // two presses at the same moment can never put one payout in two requests.
    const claimed = await tx.order.updateMany({
      where: { id: { in: orders.map((o) => o.id) }, withdrawalId: null, publisherPaid: false },
      data: { withdrawalId: w.id },
    });
    if (claimed.count !== orders.length) throw new Error("orders changed while the request was being made");
    return { id: w.id, amount, count: orders.length };
  });

  if ("error" in result) redirect(`${back}?error=${q(result.error!)}`);

  if (emailEnabled()) {
    try {
      await sendWithdrawalRequestAdmin({
        withdrawalId: result.id,
        publisherName: user.name,
        publisherEmail: user.email,
        amountCents: result.amount,
        orderCount: result.count,
        method: withdrawMethodLabel(method),
        details,
      });
    } catch (e: any) {
      console.error(`[withdrawals] could not notify admin of withdrawal ${result.id}: ${e?.message || e}`);
    }
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?success=${q("Withdrawal requested. We will review it and pay you within 72 hours.")}`);
}

/**
 * An admin answers a withdrawal request.
 *
 * Approve means the money has been sent: every order in the request is marked
 * paid. Decline releases the orders, so the publisher can fix their details and
 * ask again. Either way the publisher is emailed.
 */
export async function decideWithdrawalAction(formData: FormData) {
  const admin = await requireRole("admin");
  const id = parseInt(String(formData.get("withdrawalId") || "0")) || 0;
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim();
  const reference = String(formData.get("reference") || "").trim();
  const back = "/admin/withdrawals";

  if (!["approve", "reject"].includes(decision)) redirect(`${back}?error=${q("Choose approve or decline.")}`);
  if (decision === "reject" && note.length < 5) redirect(`${back}?error=${q("Tell the publisher why it was declined.")}`);

  const w = await prisma.withdrawal.findUnique({ where: { id }, include: { publisher: true } });
  if (!w) redirect(`${back}?error=${q("That withdrawal was not found.")}`);

  const approved = decision === "approve";
  const done = await prisma.$transaction(async (tx) => {
    // Only a pending request can be answered, and only once.
    const res = await tx.withdrawal.updateMany({
      where: { id, status: WITHDRAWAL_PENDING },
      data: {
        status: approved ? WITHDRAWAL_PAID : WITHDRAWAL_REJECTED,
        adminNote: note || null,
        reference: reference || null,
        decidedById: admin.id,
        decidedAt: new Date(),
      },
    });
    if (res.count === 0) return false;
    if (approved) {
      await tx.order.updateMany({ where: { withdrawalId: id }, data: { publisherPaid: true } });
    } else {
      await tx.order.updateMany({ where: { withdrawalId: id, publisherPaid: false }, data: { withdrawalId: null } });
    }
    return true;
  });
  if (!done) redirect(`${back}?error=${q("That withdrawal has already been answered.")}`);

  if (emailEnabled()) {
    try {
      await sendWithdrawalDecision({
        to: w!.publisher.email,
        approved,
        amountCents: w!.amountCents,
        method: withdrawMethodLabel(w!.method),
        note,
        reference,
      });
    } catch (e: any) {
      // The decision is recorded either way - never lose it to a mail failure.
      console.error(`[withdrawals] could not email the decision on withdrawal ${id}: ${e?.message || e}`);
    }
  }

  revalidatePath(back);
  revalidatePath("/admin/orders");
  redirect(
    `${back}?success=${q(
      approved
        ? `Withdrawal #${id} marked paid. ${w!.publisher.name} has been told.`
        : `Withdrawal #${id} declined. ${w!.publisher.name} has been told why and can ask again.`
    )}`
  );
}
