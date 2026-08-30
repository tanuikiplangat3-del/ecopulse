import { prisma } from "@/lib/prisma";
import { acceptInviteAction } from "@/app/actions/auth";
import { Flash } from "@/components/ui";
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

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h2 mb-1">Become a publisher</h1>
        <Flash searchParams={searchParams} />
        {!valid ? (
          <p className="flash flash-error">
            This invite link is invalid or has expired. Please ask the admin for a new one.
          </p>
        ) : (
          <>
            <p className="muted mb-5">
              Set up your publisher account, then add the website or websites you want to list.
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
              <label className="field">
                <span>Choose a password</span>
                <input className="input" type="password" name="password" required minLength={8} autoComplete="new-password" />
                <small className="muted">At least 8 characters.</small>
              </label>

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
                  I understand and agree that all payments for all orders are paid weekly on
                  <strong> Tuesday</strong>. If a payment is not received by then, I will contact
                  seo@welcometomorrow.io to resolve it. I understand my site will not be listed if
                  I do not agree.
                </span>
              </label>

              <button className="btn-primary mt-4 w-full" type="submit">
                Create my publisher account
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
