import { Resend } from "resend";
import { money } from "./money";

const key = process.env.RESEND_API_KEY || "";
const from = process.env.MAIL_FROM || "Welcome Tomorrow <seo@welcometomorrow.io>";
const resend = key ? new Resend(key) : null;

/** Where internal notifications (new orders, signups, applications) are sent. */
export const ADMIN_NOTIFY = process.env.ADMIN_NOTIFY_EMAIL || "seo@welcometomorrow.io";

export const emailEnabled = (): boolean => !!resend;

async function send(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  if (!resend) {
    console.error(`[email] RESEND_API_KEY is not set - "${subject}" to ${to} was not sent.`);
    return false;
  }
  try {
    // The Resend SDK does NOT throw when the API rejects a message; it returns
    // { data, error }. Checking only for thrown exceptions reported every
    // rejection as a success, which is why failures were invisible.
    const res: any = await resend.emails.send({ from, to, subject, html, replyTo });
    if (res?.error) {
      console.error(
        `[email] REJECTED "${subject}" to ${to} from "${from}": ${res.error.name || ""} ${res.error.message || JSON.stringify(res.error)}`
      );
      return false;
    }
    console.log(`[email] sent "${subject}" to ${to} (id ${res?.data?.id || "unknown"})`);
    return true;
  } catch (e: any) {
    console.error(`[email] FAILED "${subject}" to ${to}: ${e?.message || e}`);
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

/**
 * Buyer confirmed the link is live -> tell the publisher and the admin desk.
 * This is the moment the 72-hour payment clock starts, so both sides need it:
 * the publisher to know payment is coming, the admin to know to release it.
 */
export async function sendOrderConfirmedEmails(input: {
  publisherEmail: string;
  domain: string;
  orderId: number;
  payoutCents: number;
}) {
  const { publisherEmail, domain, orderId, payoutCents } = input;
  await send(
    publisherEmail,
    `Buyer confirmed order #${orderId} - payment on the way`,
    wrap(
      "Your link was confirmed",
      `<p>The buyer has confirmed that your link on <strong>${esc(domain)}</strong> is live, and order
          <strong>#${orderId}</strong> is now complete.</p>
       <p>Your payment of <strong>${money(payoutCents)}</strong> will be released within
          <strong>72 hours</strong> to your saved payment details.</p>`
    )
  );
  await send(
    ADMIN_NOTIFY,
    `ACTION: release payment for order #${orderId} (${domain})`,
    wrap(
      "Payment due within 72 hours",
      `<p>The buyer confirmed order <strong>#${orderId}</strong> on <strong>${esc(domain)}</strong> is live.</p>
       <p>Publisher payout: <strong>${money(payoutCents)}</strong> to ${esc(publisherEmail)}.</p>
       <p>The 72-hour payment window starts now. Release it from the admin Orders page.</p>`
    )
  );
}

/** A buyer asked us to list a publisher they negotiated -> admin review needed. */
export function sendSiteRequestAdmin(input: {
  requestId: number;
  buyerName: string;
  buyerEmail: string;
  siteName: string;
  domain: string;
  negotiatedCents: number;
  vatPercent: number;
}) {
  return send(
    ADMIN_NOTIFY,
    `Site request: ${input.domain} (from ${input.buyerName})`,
    wrap(
      "New site request to review",
      `<p><strong>${esc(input.buyerName)}</strong> (${esc(input.buyerEmail)}) has asked us to list a
          publisher they negotiated with.</p>
       <p><strong>Site:</strong> ${esc(input.siteName)}<br>
          <strong>Domain:</strong> ${esc(input.domain)}<br>
          <strong>Negotiated price:</strong> ${money(input.negotiatedCents)}<br>
          <strong>VAT:</strong> ${input.vatPercent > 0 ? input.vatPercent + "%" : "none"}</p>
       <p>Approve or reject it on the admin <strong>Site requests</strong> page. Approving lists it
          immediately: this buyer will see half the standard margin on their first 3 orders, and
          every other buyer will see the standard margin. If we already list this domain, it is
          created at standard pricing for everyone.</p>`
    )
  );
}

/** Tell the buyer whether their requested site was listed. */
export function sendSiteRequestDecision(input: {
  to: string;
  approved: boolean;
  domain: string;
  listingId?: number;
  note?: string;
}) {
  if (input.approved) {
    return send(
      input.to,
      `${input.domain} is now listed`,
      wrap(
        "Your requested site is live",
        `<p><strong>${esc(input.domain)}</strong> has been reviewed and added to the marketplace.</p>
         <p>On your first 3 orders you pay your negotiated price plus half our standard margin.
            After that it prices at the standard rate, like any other site. You can order a
            placement on it from the marketplace now.</p>`
      )
    );
  }
  return send(
    input.to,
    `About your request for ${input.domain}`,
    wrap(
      "We could not list that site",
      `<p>Thank you for sending us <strong>${esc(input.domain)}</strong>. After review we are not able
          to add it to the marketplace at this time.</p>
       ${input.note ? `<p><strong>Reason:</strong><br>${esc(input.note)}</p>` : ""}
       <p>You are welcome to send us other publishers you have negotiated with.</p>`
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
       <p>Payment for each order is released within <strong>72 hours</strong> of the buyer confirming your link is live.</p>`
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
       <p>It will be sent to your saved payment details within <strong>72 hours</strong>.</p>
       <p>If anything looks wrong, reply to this email and we will sort it out.</p>`
    )
  );
}

/** A one-off test message, so an admin can prove email works without a payment. */
export function sendTestEmail() {
  return send(
    ADMIN_NOTIFY,
    "Link Tomorrow test email",
    wrap(
      "Email is working",
      `<p>This is a test message sent from the admin dashboard.</p>
       <p>If you are reading this, the sending key and domain are set up correctly, and every
          notification - deposits, orders, signups and confirmation codes - will reach you the
          same way.</p>
       <p style="color:rgba(255,255,255,.6)">Sent ${new Date().toUTCString()}</p>`
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

/**
 * Tell a publisher how a duplicate-domain conflict was settled - whether their
 * price replaced the one we were showing, or we stayed with the existing one.
 */
export function sendListingConflictDecision(input: {
  to: string;
  domain: string;
  kept: boolean; // true = their listing is now the live one
  theirPriceCents: number;
  livePriceCents: number | null;
}) {
  if (input.kept) {
    return send(
      input.to,
      `${input.domain} is now live on Link Tomorrow`,
      wrap(
        "Your listing is live",
        `<p><strong>${esc(input.domain)}</strong> was already on the marketplace, so our team compared
            the two prices.</p>
         <p>Yours won. <strong>${esc(input.domain)}</strong> is now listed at
            <strong>${money(input.theirPriceCents)}</strong> and is available to buyers.</p>`
      )
    );
  }
  return send(
    input.to,
    `We already list ${input.domain}`,
    wrap(
      "We are keeping the current listing",
      `<p>Thank you for submitting <strong>${esc(input.domain)}</strong>. It is already on the
          marketplace${input.livePriceCents !== null ? ` at <strong>${money(input.livePriceCents)}</strong>` : ""},
          and after comparing the two we are staying with the existing listing.</p>
       <p>Your price was ${money(input.theirPriceCents)}. If you can improve on the price we are
          currently showing, submit the site again and we will review it.</p>`
    )
  );
}
