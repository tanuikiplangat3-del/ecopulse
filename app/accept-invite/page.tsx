import { prisma } from "@/lib/prisma";
import { acceptInviteAction } from "@/app/actions/auth";
import { Flash } from "@/components/ui";
import { NewPasswordFields } from "@/components/PasswordField";
import { one } from "@/lib/util";

export const metadata = { title: "Publisher invite", robots: { index: false } };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const token = one(searchParams.token);
  const invite = token ? await prisma.invite.findUnique({ where: { token } }) : null;
  const valid = invite && !invite.acceptedAt && invite.expiresAt > new Date();
  const isAdminInvite = invite?.role === "admin";
  // A link generated from a buyer's site request. Naming the buyer is the whole
  // reason the publisher trusts the link - it arrived forwarded from them.
  const invitingBuyer =
    valid && invite!.requestedById
      ? await prisma.user.findUnique({ where: { id: invite!.requestedById } })
      : null;
  const requestedSite =
    valid && invite!.siteRequestId
      ? await prisma.siteRequest.findUnique({ where: { id: invite!.siteRequestId } })
      : null;

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h2 mb-1">{isAdminInvite ? "Set up your admin account" : "Become a publisher"}</h1>
        <Flash searchParams={searchParams} />
        {!valid ? (
          <p className="flash flash-error">
            This invite link is invalid or has expired. Please ask the admin for a new one.
          </p>
        ) : (
          <>
            {invitingBuyer && (
              <div className="mb-5 rounded-md border border-wt-green/40 bg-wt-green/10 p-3 text-sm">
                <p>
                  <strong className="text-wt-green">{invitingBuyer.name}</strong> asked us to set
                  you up{requestedSite ? ` for ${requestedSite.domain}` : ""}.
                </p>
                <p className="muted mt-2 text-xs">
                  Set your own prices here. You are paid within 72 hours of the buyer confirming
                  each link is live, straight to the payment details you save in the next step.
                </p>
              </div>
            )}

            <p className="muted mb-5">
              {isAdminInvite
                ? "You have been invited as an admin. Choose a name and password to finish setting up your account."
                : "Set up your publisher account, then add the website or websites you want to list."}
            </p>
            <form action={acceptInviteAction}>
              <input type="hidden" name="token" value={token} />
              <label className="field">
                <span>Your name</span>
                <input className="input" name="name" required autoComplete="name" />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  className="input"
                  type="email"
                  name="email"
                  defaultValue={invite!.email || ""}
                  required
                  autoComplete="email"
                />
              </label>
              <NewPasswordFields />

              {!isAdminInvite && (
                <>
                  <fieldset className="field">
                    <span>How many websites do you want to list?</span>
                    <div className="mt-2 grid gap-2">
                      <label className="flex items-center gap-2 rounded-md border border-wt-border bg-white/5 p-3 text-sm">
                        <input type="radio" name="sites" value="single" defaultChecked /> I have one website (add it on the next step)
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-wt-border bg-white/5 p-3 text-sm">
                        <input type="radio" name="sites" value="multiple" /> I have multiple websites (upload a spreadsheet)
                      </label>
                    </div>
                  </fieldset>

                  <label className="mt-2 flex items-start gap-3 rounded-md border border-wt-border bg-white/5 p-3 text-sm">
                    <input type="checkbox" name="agreeTuesday" className="mt-1" required />
                    <span>
                      I understand and agree that payment for each order is released within
                      <strong> 72 hours</strong> of the buyer confirming the link is live. If a
                      payment has not arrived within that window, I will contact
                      seo@welcometomorrow.io to resolve it. I understand my site will not be listed
                      if I do not agree.
                    </span>
                  </label>
                </>
              )}

              <button className="btn-primary mt-4 w-full" type="submit">
                {isAdminInvite ? "Create my admin account" : "Create my publisher account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
