import { Resend } from "resend";

const key = process.env.RESEND_API_KEY || "";
const from = process.env.MAIL_FROM || "Welcome Tomorrow Ecopulse <seo-desk@ecopulse.co.ke>";
const resend = key ? new Resend(key) : null;

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
