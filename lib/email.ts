import { Resend } from "resend";
import { money } from "./money";

const key = process.env.RESEND_API_KEY || "";
const from = process.env.MAIL_FROM || "Welcome Tomorrow <seo@welcometomorrow.io>";
const resend = key ? new Resend(key) : null;

/** Where internal notifications (new orders, signups, applications) are sent. */
export const ADMIN_NOTIFY = process.env.ADMIN_NOTIFY_EMAIL || "seo@welcometomorrow.io";

export const emailEnabled = (): boolean => !!resend;

async function send(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  if (!resend) return false;
  try {
    await resend.emails.send({ from, to, subject, html, replyTo });
    return true;
  } catch (e) {
    console.error("Email send failed:", e);
    return false;
  }
}

/** Escape user-supplied text before putting it in an HTML email. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/** Chat / contact form -> the SEO desk inbox, with the visitor set as reply-to. */
export function sendContactEmail(input: { name: string; email: string; message: string }) {
  return send(
    "seo@welcometomorrow.io",
    `New chat message from ${input.name}`,
    wrap(
      "New message from the Ecopulse chat",
      `<p><strong>Name:</strong> ${esc(input.name)}</p>
       <p><strong>Email:</strong> ${esc(input.email)}</p>
       <p><strong>Message:</strong></p>
       <p>${esc(input.message)}</p>`
    ),
    input.email
  );
}

const wrap = (title: string, body: string) => `
  <div style="font-family:Outfit,Arial,sans-serif;background:#000;color:#fff;padding:32px;border-radius:20px">
    <h1 style="color:#0aa865;margin:0 0 16px">${title}</h1>
    <div style="font-size:16px;line-height:1.5;color:#fff">${body}</div>
    <p style="color:rgba(255,255,255,.6);font-size:13px;margin-top:24px">Welcome Tomorrow Ecopulse - Link Building Marketplace</p>
  </div>`;

export function sendInviteEmail(to: string, link: string) {
  return send(
    to,
    "You've been invited to publish on Welcome Tomorrow Ecopulse",
    wrap(
      "You're invited to become a publisher",
      `<p>You've been invited to list your websites on the Welcome Tomorrow Ecopulse link-building marketplace.</p>
       <p><a href="${link}" style="display:inline-block;background:#0aa865;color:#fff;padding:14px 28px;border-radius:30px;text-decoration:none;font-weight:700">Accept your invite</a></p>
       <p style="color:rgba(255,255,255,.6)">This link expires in 7 days.</p>`
    )
  );
}

export function sendVerificationEmail(to: string, link: string) {
  return send(
    to,
    "Verify your Ecopulse account",
    wrap(
      "Verify your email",
      `<p>Confirm your email to activate your account.</p>
       <p><a href="${link}" style="display:inline-block;background:#0aa865;color:#fff;padding:14px 28px;border-radius:30px;text-decoration:none;font-weight:700">Verify email</a></p>`
    )
  );
}

export function sendOrderNotice(to: string, subject: string, message: string) {
  return send(to, subject, wrap(subject, `<p>${message}</p>`));
}

/** Deposit succeeded -> confirm to the buyer and promise an invoice within 24h. */
export function sendDepositReceipt(to: string, grossCents: number, netCents: number) {
  return send(
    to,
    "Your deposit was successful",
    wrap(
      "Deposit received",
      `<p>We have received your deposit of <strong>${money(grossCents)}</strong>.</p>
       <p>After the 5% service fee, <strong>${money(netCents)}</strong> has been added to your wallet balance and is ready to use.</p>
       <p>Your invoice will be emailed to you within 24 hours.</p>`
    )
  );
}

/** New paid order -> notify the publisher AND the admin desk so both can act. */
export async function sendNewOrderEmails(input: {
  publisherEmail: string;
  domain: string;
  orderId: number;
  buyerName?: string;
}) {
  const { publisherEmail, domain, orderId } = input;
  await send(
    publisherEmail,
    `New order on ${domain}`,
    wrap(
      "You have a new order",
      `<p>You have received a new order (#${orderId}) for a placement on <strong>${esc(domain)}</strong>.</p>
       <p>Sign in to your dashboard, open <strong>Orders</strong>, confirm you received it, then publish the link and submit the live URL.</p>`
    )
  );
  await send(
    ADMIN_NOTIFY,
    `New order #${orderId} on ${domain}`,
    wrap(
      "New order placed",
      `<p>A new order (#${orderId}) was placed on <strong>${esc(domain)}</strong>${
        input.buyerName ? ` by ${esc(input.buyerName)}` : ""
      }.</p>
       <p>Follow up from the admin Orders page.</p>`
    )
  );
}

/** A new buyer registered -> let the admin desk know. */
export function sendBuyerSignupAdmin(name: string, email: string) {
  return send(
    ADMIN_NOTIFY,
    "New buyer signed up",
    wrap(
      "New buyer account",
      `<p>A new buyer just created an account:</p>
       <p><strong>Name:</strong> ${esc(name)}<br><strong>Email:</strong> ${esc(email)}</p>`
    )
  );
}

/** Applicant was rejected -> tell them, with an optional note from the admin. */
export function sendApplicationRejected(to: string, note: string) {
  return send(
    to,
    "Update on your publisher request - Welcome Tomorrow",
    wrap(
      "About your publisher request",
      `<p>Thank you for your interest in listing on the Welcome Tomorrow marketplace.</p>
       <p>After review, we are unable to approve your website(s) at this time.</p>
       ${note ? `<p><strong>Note from our team:</strong><br>${esc(note)}</p>` : ""}
       <p>You are welcome to apply again in the future as your site grows.</p>`
    )
  );
}

/** Someone requested to be listed as a publisher -> notify the admin desk. */
export function sendPublisherApplicationAdmin(input: { name: string; email: string; urls: string }) {
  return send(
    ADMIN_NOTIFY,
    `Publisher request from ${input.name}`,
    wrap(
      "New publisher request",
      `<p>A new publisher has requested to be listed:</p>
       <p><strong>Name:</strong> ${esc(input.name)}<br><strong>Email:</strong> ${esc(input.email)}</p>
       <p><strong>Websites for review:</strong></p>
       <p>${esc(input.urls)}</p>`
    ),
    input.email
  );
}
