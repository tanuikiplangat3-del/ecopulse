"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSession, destroySession } from "@/lib/auth";
import { emailEnabled, sendVerificationEmail } from "@/lib/email";
import { appUrl } from "@/lib/stripe";
import { randomBytes } from "crypto";

function q(s: string) {
  return encodeURIComponent(s);
}

/** Public registration - BUYERS ONLY. Publishers are invite-only. */
export async function registerAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name) redirect(`/register?error=${q("Please enter your name.")}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    redirect(`/register?error=${q("Enter a valid email address.")}`);
  if (password.length < 8)
    redirect(`/register?error=${q("Password must be at least 8 characters.")}`);

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

  if (emailEnabled()) {
    const token = randomBytes(24).toString("hex");
    await prisma.emailVerification.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 86400_000) },
    });
    await sendVerificationEmail(email, `${appUrl()}/verify-email?token=${token}`);
    redirect(`/login?success=${q("Check your email for a verification link, then sign in.")}`);
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
    redirect(`/login?error=${q("Please verify your email first.")}`);
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  destroySession();
  redirect("/");
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
      await sendOrderNotice(email, "Reset your Ecopulse password", `Open this link to reset your password: <a href="${link}">${link}</a>`);
      redirect(`/login?success=${q("If that email exists, a reset link is on its way.")}`);
    }
    // Email off: show the link directly (dev convenience)
    redirect(`/login?success=${q("Reset link (email is off): " + link)}`);
  }
  redirect(`/login?success=${q("If that email exists, a reset link is on its way.")}`);
}

export async function resetAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const pr = await prisma.passwordReset.findUnique({ where: { token } });
  if (!pr || pr.expiresAt < new Date())
    redirect(`/reset-password?token=${q(token)}&error=${q("This reset link is invalid or has expired.")}`);
  if (password.length < 8)
    redirect(`/reset-password?token=${q(token)}&error=${q("Password must be at least 8 characters.")}`);
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
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    redirect(`/accept-invite?token=${q(token)}&error=${q("This invite is invalid or has expired.")}`);
  }
  const email = (String(formData.get("email") || "") || invite!.email || "").trim().toLowerCase();
  if (!name) redirect(`/accept-invite?token=${q(token)}&error=${q("Please enter your name.")}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    redirect(`/accept-invite?token=${q(token)}&error=${q("Enter a valid email address.")}`);
  if (password.length < 8)
    redirect(`/accept-invite?token=${q(token)}&error=${q("Password must be at least 8 characters.")}`);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/login?error=${q("An account already exists for this email. Please sign in.")}`);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "publisher",
      verified: true,
    },
  });
  await prisma.invite.update({ where: { token }, data: { acceptedAt: new Date() } });
  await createSession(user.id);
  // Send them straight to add their site(s), then payment details.
  redirect(sites === "multiple" ? "/bulk-upload?first=1" : "/new-listing?first=1");
}
