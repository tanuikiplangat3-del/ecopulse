"use server";

import { sendContactEmail, emailEnabled } from "@/lib/email";
import { allow, clientIp, LIMITS, TOO_MANY } from "@/lib/rate-limit";

export type ContactState = { ok?: boolean; error?: string };

/** Chat widget submit -> emails the SEO desk (seo@welcometomorrow.io). */
export async function sendChatAction(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!name || !message) return { error: "Please add your name and a message." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { error: "Please enter a valid email so we can reply." };

  if (name.length > 200 || message.length > 5000) return { error: "That message is too long. Please shorten it." };
  if (!(await allow([[`contact:ip:${await clientIp()}`, LIMITS.contactPerIp]]))) return { error: TOO_MANY };

  if (!emailEnabled())
    return { error: "Chat email isn't configured yet. Please email seo@welcometomorrow.io directly." };

  const sent = await sendContactEmail({ name, email, message });
  if (!sent)
    return { error: "Sorry, we couldn't send that right now. Please email seo@welcometomorrow.io directly." };

  return { ok: true };
}
