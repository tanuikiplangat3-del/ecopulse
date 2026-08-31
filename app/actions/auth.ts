"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSession, destroySession } from "@/lib/auth";
import {
  emailEnabled,
  sendVerificationCodeEmail,
  sendBuyerSignupAdmin,
  sendPublisherWelcome,
  sendPublisherSignupAdmin,
  sendAdminSignupAdmin,
} from "@/lib/email";
import { appUrl } from "@/lib/stripe";
import { passwordProblem } from "@/lib/password";
import { randomBytes, randomInt } from "crypto";

function q(s: string) {
  return encodeURIComponent(s);
}

/** A cryptographically random 6-digit code, always 6 characters. */
function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Issue (or re-issue) a confirmation code for a user and email it to them. */
async function issueVerificationCode(userId: number, email: string): Promise<boolean> {
  const code = sixDigitCode();
  await prisma.emailVerification.deleteMany({ where: { userId } });
  await prisma.emailVerification.create({
    data: {
      token: randomBytes(24).toString("hex"),
      userId,
      code,
      attempts: 0,
      expiresAt: new Date(Date.now() + 15 * 60_000), // 15 minutes
    },
  });
  return sendVerificationCodeEmail(email, code);
}

/** Public registration - BUYERS ONLY. Publishers are invite-only. */
export async function registerAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!name) redirect(`/register?error=${q("Please enter your name.")}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    redirect(`/register?error=${q("Enter a valid email address.")}`);
  const pwProblem = passwordProblem(password);
  if (pwProblem) redirect(`/register?error=${q(pwProblem)}`);
  if (password !== confirmPassword)
    redirect(`/register?error=${q("Both passwords must match.")}`);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect(`/register?error=${q("That email is already registered. Try signing in.")}`);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "buyer", // hard-coded: public signup can never create publisher/admin
      verified: !emailEnabled(),
    },
  });

  // Let the admin desk know a new buyer joined (best-effort).
  await sendBuyerSignupAdmin(name, email);

  if (emailEnabled()) {
    const sent = await issueVerificationCode(user.id, email);
    if (sent) {
      redirect(`/verify-email?email=${q(email)}&success=${q("We sent a 6-digit code to " + email + ".")}`);
    }
    // The email could not be delivered (e.g. the sending domain isn't verified in
    // Resend yet). Never strand the buyer: activate the account and sign them in.
    await prisma.user.update({ where: { id: user.id }, data: { verified: true } });
    await prisma.emailVerification.deleteMany({ where: { userId: user.id } });
    await createSession(user.id);
    redirect(`/dashboard?success=${q("Welcome! Your account is ready.")}`);
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/login?error=${q("Wrong email or password.")}`);
  }
  if (!user.verified) {
    // Send them a fresh code and take them straight to the confirm screen.
    if (emailEnabled()) await issueVerificationCode(user!.id, user!.email);
    redirect(
      `/verify-email?email=${q(user!.email)}&success=${q("Please confirm your email. We sent a new 6-digit code to " + user!.email + ".")}`
    );
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  destroySession();
  redirect("/");
}

/** Confirm an account with the 6-digit code emailed at sign-up. */
export async function verifyCodeAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const code = String(formData.get("code") || "").replace(/\D/g, "");
  const back = `/verify-email?email=${q(email)}`;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect(`${back}&error=${q("We could not find that account. Please sign up again.")}`);
  if (user!.verified) redirect(`/login?success=${q("Your email is already confirmed. Please sign in.")}`);

  const rec = await prisma.emailVerification.findFirst({
    where: { userId: user!.id },
    orderBy: { expiresAt: "desc" },
  });
  if (!rec || rec.expiresAt < new Date())
    redirect(`${back}&error=${q("That code has expired. Send yourself a new one below.")}`);
  if (rec!.attempts >= 6) {
    await prisma.emailVerification.deleteMany({ where: { userId: user!.id } });
    redirect(`${back}&error=${q("Too many incorrect codes. Send yourself a new one below.")}`);
  }
  if (code.length !== 6 || code !== rec!.code) {
    await prisma.emailVerification.update({
      where: { token: rec!.token },
      data: { attempts: rec!.attempts + 1 },
    });
    redirect(`${back}&error=${q("That code is not correct. Please check your email and try again.")}`);
  }

  await prisma.user.update({ where: { id: user!.id }, data: { verified: true } });
  await prisma.emailVerification.deleteMany({ where: { userId: user!.id } });
  await createSession(user!.id);
  redirect(`/dashboard?success=${q("Email confirmed. Welcome to Link Tomorrow!")}`);
}

/** Email a fresh 6-digit code to an account that has not been confirmed yet. */
export async function resendCodeAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const back = `/verify-email?email=${q(email)}`;
  const user = await prisma.user.findUnique({ where: { email } });
  // Never reveal whether the address exists.
  if (!user || user.verified) {
    redirect(`${back}&success=${q("If that account needs confirming, a new code is on its way.")}`);
  }
  if (!emailEnabled()) {
    await prisma.user.update({ where: { id: user!.id }, data: { verified: true } });
    redirect(`/login?success=${q("Email sending is off, so your account was activated. Please sign in.")}`);
  }
  await issueVerificationCode(user!.id, user!.email);
  redirect(`${back}&success=${q("A new 6-digit code is on its way to " + email + ".")}`);
}

export async function forgotAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = randomBytes(24).toString("hex");
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
    await prisma.passwordReset.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 3600_000) },
    });
    const link = `${appUrl()}/reset-password?token=${token}`;
    if (emailEnabled()) {
      const { sendOrderNotice } = await import("@/lib/email");
      await sendOrderNotice(email, "Reset your Link Tomorrow password", `Open this link to reset your password: <a href="${link}">${link}</a>`);
      redirect(`/login?success=${q("If that email exists, a reset link is on its way.")}`);
    }
    // Email sending is off - never print the reset link on screen, since anyone
    // who typed the address would then be able to take over the account.
    console.error("[auth] Password reset requested but email is not configured.");
    redirect(`/login?success=${q("If that email exists, a reset link is on its way.")}`);
  }
  redirect(`/login?success=${q("If that email exists, a reset link is on its way.")}`);
}

export async function resetAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const pr = await prisma.passwordReset.findUnique({ where: { token } });
  if (!pr || pr.expiresAt < new Date())
    redirect(`/reset-password?token=${q(token)}&error=${q("This reset link is invalid or has expired.")}`);
  const pwProblem = passwordProblem(password);
  if (pwProblem) redirect(`/reset-password?token=${q(token)}&error=${q(pwProblem)}`);
  if (password !== String(formData.get("confirmPassword") || ""))
    redirect(`/reset-password?token=${q(token)}&error=${q("Both passwords must match.")}`);
  await prisma.user.update({ where: { id: pr!.userId }, data: { passwordHash: await hashPassword(password) } });
  await prisma.passwordReset.delete({ where: { token } });
  redirect(`/login?success=${q("Password updated. Please sign in.")}`);
}

/** Accept a publisher invite: set name + password, become a verified publisher. */
export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");

  const sites = String(formData.get("sites") || "single");
  const agreedTuesday = String(formData.get("agreeTuesday") || "") === "on";
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    redirect(`/accept-invite?token=${q(token)}&error=${q("This invite is invalid or has expired.")}`);
  }
  // The invite decides the role - never the form, which the visitor controls.
  const isAdminInvite = invite!.role === "admin";
  const email = (String(formData.get("email") || "") || invite!.email || "").trim().toLowerCase();
  if (!name) redirect(`/accept-invite?token=${q(token)}&error=${q("Please enter your name.")}`);
  if (!isAdminInvite && !agreedTuesday)
    redirect(`/accept-invite?token=${q(token)}&error=${q("You must agree that payouts are made every Tuesday to be listed.")}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    redirect(`/accept-invite?token=${q(token)}&error=${q("Enter a valid email address.")}`);
  const pwProblem = passwordProblem(password);
  if (pwProblem) redirect(`/accept-invite?token=${q(token)}&error=${q(pwProblem)}`);
  if (password !== String(formData.get("confirmPassword") || ""))
    redirect(`/accept-invite?token=${q(token)}&error=${q("Both passwords must match.")}`);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/login?error=${q("An account already exists for this email. Please sign in.")}`);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: isAdminInvite ? "admin" : "publisher",
      verified: true,
      tuesdayAgreed: !isAdminInvite,
    },
  });
  await prisma.invite.update({ where: { token }, data: { acceptedAt: new Date() } });

  if (emailEnabled()) {
    if (isAdminInvite) {
      await sendAdminSignupAdmin(name, email);
    } else {
      await sendPublisherWelcome(email, name);
      await sendPublisherSignupAdmin(name, email);
    }
  }

  await createSession(user.id);
  if (isAdminInvite) redirect(`/admin?success=${q("Welcome. Your admin account is ready.")}`);
  // Send them straight to add their site(s), then payment details.
  redirect(sites === "multiple" ? "/bulk-upload?first=1" : "/new-listing?first=1");
}
