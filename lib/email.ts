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
    ADMIN_NOTIFY,
    `New chat message from ${input.name}`,
    wrap(
      "New message from the Link Tomorrow chat",
      `<p><strong>Name:</strong> ${esc(input.name)}</p>
       <p><strong>Email:</strong> ${esc(input.email)}</p>
       <p><strong>Message:</strong></p>
       <p>${esc(input.message)}</p>`
    ),
    input.email
  );
}

/**
 * The Welcome Tomorrow mark, served from the app's own public folder so it has a
 * stable absolute URL. Email clients cannot load relative paths, and many block
 * remote images until the reader allows them - hence the alt text.
 */
const logoUrl = (): string =>
  `${(process.env.APP_URL || "https://tools.welcometomorrow.io/linktomorrow").replace(/\/$/, "")}/email-logo.png`;

const wrap = (title: string, body: string) => `
  <div style="font-family:Outfit,Arial,sans-serif;background:#000;color:#fff;padding:32px;border-radius:20px">
    <img src="${logoUrl()}" width="52" height="52" alt="Welcome Tomorrow"
         style="display:block;border:0;outline:none;text-decoration:none;border-radius:12px;margin:0 0 20px" />
    <h1 style="color:#0aa865;margin:0 0 16px">${title}</h1>
    <div style="font-size:16px;line-height:1.5;color:#fff">${body}</div>
    <p style="color:rgba(255,255,255,.6);font-size:13px;margin-top:24px">Link Tomorrow - Link Building Marketplace</p>
  </div>`;

export function sendInviteEmail(to: string, link: string) {
  return send(
    to,
    "You've been invited to publish on Link Tomorrow",
    wrap(
      "You're invited to become a publisher",
      `<p>You've been invited to list your websites on the Link Tomorrow link-building marketplace.</p>
       <p><a href="${link}" style="display:inline-block;background:#0aa865;color:#fff;padding:14px 28px;border-radius:30px;text-decoration:none;font-weight:700">Accept your invite</a></p>
       <p style="color:rgba(255,255,255,.6)">This link expires in 7 days.</p>`
    )
  );
}

/** Send the 6-digit confirmation code the user types into the confirm screen. */
export function sendVerificationCodeEmail(to: string, code: string) {
  return send(
    to,
    `${code} is your Link Tomorrow confirmation code`,
    wrap(
      "Confirm your email",
      `<p>Enter this 6-digit code on the confirmation screen to activate your account:</p>
       <p style="font-size:34px;font-weight:800;letter-spacing:10px;color:#0aa865;margin:24px 0">${esc(code)}</p>
       <p style="color:rgba(255,255,255,.6)">This code expires in 15 minutes. If you did not create a Link Tomorrow account, you can ignore this email.</p>`
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

/** A publisher accepted their invite -> welcome them. */
export function sendPublisherWelcome(to: string, name: string) {
  return send(
    to,
    "Your publisher account is ready - Link Tomorrow",
    wrap(
      "Welcome aboard",
      `<p>Hi ${esc(name)}, your publisher account is active.</p>
       <p>Add the websites you want to list, then set your payment details so we can pay you.</p>
       <p>Payouts are made weekly on <strong>Tuesday</strong> for every order marked complete.</p>`
    )
  );
}

/** A publisher joined -> notify the admin desk. */
export function sendPublisherSignupAdmin(name: string, email: string) {
  return send(
    ADMIN_NOTIFY,
    "New publisher joined",
    wrap(
      "New publisher account",
      `<p>A publisher accepted their invite and created an account:</p>
       <p><strong>Name:</strong> ${esc(name)}<br><strong>Email:</strong> ${esc(email)}</p>`
    )
  );
}

/** A new admin joined -> notify the admin desk so it is never a surprise. */
export function sendAdminSignupAdmin(name: string, email: string) {
  return send(
    ADMIN_NOTIFY,
    "New admin account created",
    wrap(
      "New admin account",
      `<p>A new <strong>admin</strong> account was created from an admin invite link:</p>
       <p><strong>Name:</strong> ${esc(name)}<br><strong>Email:</strong> ${esc(email)}</p>
       <p>If you did not expect this, revoke the invite and remove the account immediately.</p>`
    )
  );
}

/** Invite someone to become an admin. */
export function sendAdminInviteEmail(to: string, link: string) {
  return send(
    to,
    "You've been invited as an admin on Link Tomorrow",
    wrap(
      "You're invited as an admin",
      `<p>You've been given admin access to the Link Tomorrow marketplace.</p>
       <p><a href="${link}" style="display:inline-block;background:#0aa865;color:#fff;padding:14px 28px;border-radius:30px;text-decoration:none;font-weight:700">Set up your admin account</a></p>
       <p style="color:rgba(255,255,255,.6)">This link expires in 7 days. Do not forward it - anyone who opens it gets full admin access.</p>`
    )
  );
}

/** Publisher submitted a live URL -> notify the admin desk. */
export function sendLiveUrlAdmin(orderId: number, domain: string, liveUrl: string) {
  return send(
    ADMIN_NOTIFY,
    `Link went live on ${domain} (order #${orderId})`,
    wrap(
      "A link just went live",
      `<p>The publisher submitted the live URL for order <strong>#${orderId}</strong> on <strong>${esc(domain)}</strong>.</p>
       <p><a href="${liveUrl}" style="color:#0aa865">${esc(liveUrl)}</a></p>
       <p>The buyer has been asked to confirm. Once complete, pay the publisher from the admin Orders page.</p>`
    )
  );
}

/** A buyer deposit cleared -> notify the admin desk (the buyer gets their own receipt). */
export function sendDepositAdmin(buyerEmail: string, grossCents: number, netCents: number) {
  return send(
    ADMIN_NOTIFY,
    "New deposit received",
    wrap(
      "New deposit",
      `<p>A buyer topped up their wallet:</p>
       <p><strong>Buyer:</strong> ${esc(buyerEmail)}<br>
          <strong>Deposited:</strong> ${money(grossCents)}<br>
          <strong>Credited after the 5% service fee:</strong> ${money(netCents)}</p>
       <p>Remember to send their invoice within 24 hours.</p>`
    )
  );
}

/** Publisher payout approved -> tell the publisher. */
export function sendPublisherPaid(to: string, orderId: number, domain: string) {
  return send(
    to,
    `Payment approved for order #${orderId}`,
    wrap(
      "Your payment has been approved",
      `<p>Your payment for order <strong>#${orderId}</strong> on <strong>${esc(domain)}</strong> has been approved.</p>
       <p>It will be sent to your saved payment details on the next <strong>Tuesday</strong> payout run.</p>
       <p>If anything looks wrong, reply to this email and we will sort it out.</p>`
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
