import { prisma } from "@/lib/prisma";
import { acceptInviteAction } from "@/app/actions/auth";
import { Flash } from "@/components/ui";
import { one } from "@/lib/util";

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
        <h1 className="h2 mb-1">Publisher invite</h1>
        <Flash searchParams={searchParams} />
        {!valid ? (
          <p className="flash flash-error">
            This invite link is invalid or has expired. Please ask the admin for a new one.
          </p>
        ) : (
          <>
            <p className="muted mb-5">
              You&apos;ve been invited to publish on Ecopulse as{" "}
              <strong className="text-white">{invite!.email}</strong>. Set your name and password to finish.
            </p>
            <form action={acceptInviteAction}>
              <input type="hidden" name="token" value={token} />
              <label className="field">
                <span>Your name</span>
                <input className="input" name="name" required autoComplete="name" />
              </label>
              <label className="field">
                <span>Choose a password</span>
                <input className="input" type="password" name="password" required minLength={8} autoComplete="new-password" />
                <small className="muted">At least 8 characters.</small>
              </label>
              <button className="btn-primary w-full" type="submit">
                Activate my publisher account
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
