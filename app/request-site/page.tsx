import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Flash } from "@/components/ui";
import { appUrl } from "@/lib/stripe";
import { INVITE_DAYS, MAX_OPEN_INVITES } from "@/lib/invites";
import {
  createPublisherInviteAction,
  cancelPublisherInviteAction,
} from "@/app/actions/publisher-invites";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invite publisher" };

export default async function RequestSitePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireRole("buyer");
  const base = appUrl();
  const mine = { requestedById: user.id, siteRequestId: null };

  const invites = await prisma.invite.findMany({
    where: mine,
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Counted with the same query the action uses, not from the 30 rows above, so
  // the number on screen is the number that will actually be enforced.
  const open = await prisma.invite.count({
    where: { ...mine, acceptedAt: null, expiresAt: { gt: new Date() } },
  });

  // Publishers who actually joined through THIS buyer, so an accepted link can
  // name them. Keyed on the attribution we set at sign-up rather than on the
  // address the buyer typed, which they do not necessarily end up using.
  const joined = await prisma.user.findMany({
    where: { invitedByBuyerId: user.id, role: "publisher" },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const joinedByEmail = new Map<string, any>(joined.map((u: any) => [u.email, u]));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h2 mb-1">Invite publisher</h1>
      <p className="muted mb-6">
        Negotiated a good price? We will reward you with a discounted price to use the platform.
        Put in your publisher&rsquo;s email and we will make you a sign-up link to send them.
      </p>
      <Flash searchParams={searchParams} />

      <form action={createPublisherInviteAction} className="card">
        <label className="field">
          <span>Publisher&rsquo;s email</span>
          <input
            className="input"
            type="email"
            name="publisherEmail"
            placeholder="jane@konemedia.co.ke"
            required
            autoComplete="off"
          />
          <small className="muted">We email the link straight to them, and to you as well.</small>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field mb-0">
            <span>Their name <span className="muted">(optional)</span></span>
            <input className="input" name="publisherName" placeholder="Jane Doe" autoComplete="off" />
          </label>
          <label className="field mb-0">
            <span>Their website <span className="muted">(optional)</span></span>
            <input className="input" name="site" placeholder="konemedia.co.ke" autoComplete="off" />
          </label>
        </div>

        <button className="btn-primary mt-5 w-full" type="submit">Create the link</button>
        <p className="muted mt-3 text-center text-xs">
          Each link works once and expires in {INVITE_DAYS} days.
        </p>
      </form>

      <div className="card mt-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h3">Your links</h2>
          <span className="muted text-xs">
            {open} of {MAX_OPEN_INVITES} waiting to be used
          </span>
        </div>

        {invites.length === 0 ? (
          <p className="muted text-sm">
            No links yet. Create one above and send it to a publisher you have already agreed terms
            with.
          </p>
        ) : (
          <div className="space-y-3">
            {invites.map((i: any) => {
              const who = i.email ? joinedByEmail.get(i.email) : null;
              const expired = !i.acceptedAt && i.expiresAt <= new Date();
              const link = `${base}/accept-invite?token=${i.token}`;
              return (
                <div key={i.id} className="rounded-md border border-wt-border bg-white/5 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{i.email}</p>
                      <p className="muted text-xs">
                        Created {i.createdAt.toISOString().slice(0, 10)}
                        {!i.acceptedAt && !expired && ` · expires ${i.expiresAt.toISOString().slice(0, 10)}`}
                      </p>
                    </div>
                    {i.acceptedAt ? (
                      <span className="badge badge-green">
                        {who ? `joined: ${who.name}` : "joined"}
                      </span>
                    ) : expired ? (
                      <span className="badge badge-muted">expired</span>
                    ) : (
                      <span className="badge badge-yellow">waiting to sign up</span>
                    )}
                  </div>

                  {!i.acceptedAt && !expired && (
                    <>
                      <p className="mt-3 break-all rounded-md border border-wt-border bg-black/30 p-2 font-mono text-xs text-white/80">
                        {link}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <a
                          className="btn-ghost btn-sm"
                          href={`mailto:${encodeURIComponent(i.email)}?subject=${encodeURIComponent("Join me on Link Tomorrow")}&body=${encodeURIComponent(`Hi,\n\nPlease use this link to set up your publisher account on Link Tomorrow:\n\n${link}\n\nThanks,\n${user.name}`)}`}
                        >
                          Send it again
                        </a>
                        <form action={cancelPublisherInviteAction}>
                          <input type="hidden" name="id" value={i.id} />
                          <button className="btn-danger btn-sm" type="submit">Cancel link</button>
                        </form>
                      </div>
                    </>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="muted mt-6 text-center text-sm">Publisher will not sign up themselves? Chat us.</p>
    </div>
  );
}
