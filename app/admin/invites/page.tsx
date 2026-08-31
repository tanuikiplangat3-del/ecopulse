import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Flash } from "@/components/ui";
import { invitePublisherAction, revokeInviteAction, createShareInviteAction, inviteAdminAction } from "@/app/actions/admin";
import { emailEnabled } from "@/lib/email";

export default async function AdminInvites({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  await requireRole("admin");
  const invites = await prisma.invite.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="h2 mb-1">Invites</h1>
      <p className="muted mb-6">Publishers and admins can only join by invite. Enter an email to send one.</p>
      <Flash searchParams={searchParams} />

      <form action={invitePublisherAction} className="card mb-4 flex items-end gap-3">
        <label className="field mb-0 flex-1">
          <span>Invite a publisher by email</span>
          <input className="input" type="email" name="email" placeholder="publisher@example.com" required />
        </label>
        <button className="btn-primary" type="submit">Send invite</button>
      </form>

      <form action={createShareInviteAction} className="card mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-white/80">Or create a shareable link the publisher fills in themselves.</span>
        <button className="btn-ghost btn-sm" type="submit">Create shareable invite link</button>
      </form>
      {!emailEnabled() && (
        <p className="flash flash-info">Email isn&apos;t configured, so the invite link will be shown here after you create it - copy and send it manually.</p>
      )}

      <div className="card mb-6 border-wt-yellow/40">
        <h2 className="h3 mb-1">Invite another admin</h2>
        <p className="muted mb-4 text-sm">
          Admins can see every order, approve listings and release publisher payments. Only invite
          people you trust - admin invites are always tied to one email address and are never shareable links.
        </p>
        <form action={inviteAdminAction} className="flex items-end gap-3">
          <label className="field mb-0 flex-1">
            <span>New admin email</span>
            <input className="input" type="email" name="email" placeholder="admin@welcometomorrow.io" required />
          </label>
          <button className="btn-accent" type="submit">Send admin invite</button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-wt">
          <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Expires</th><th></th></tr></thead>
          <tbody>
            {invites.length === 0 && (<tr><td colSpan={5} className="muted">No invites yet.</td></tr>)}
            {invites.map((i) => (
              <tr key={i.id}>
                <td className="font-semibold">{i.email || <span className="text-white/50">shareable link</span>}</td>
                <td>
                  <span className={`badge ${i.role === "admin" ? "badge-yellow" : "badge-muted"}`}>{i.role}</span>
                </td>
                <td>
                  {i.acceptedAt ? <span className="badge badge-green">accepted</span>
                    : i.expiresAt < new Date() ? <span className="badge badge-red">expired</span>
                    : <span className="badge badge-yellow">pending</span>}
                </td>
                <td className="muted">{i.expiresAt.toISOString().slice(0, 10)}</td>
                <td>
                  {!i.acceptedAt && (
                    <form action={revokeInviteAction}><input type="hidden" name="id" value={i.id} /><button className="btn-danger btn-sm" type="submit">Revoke</button></form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
