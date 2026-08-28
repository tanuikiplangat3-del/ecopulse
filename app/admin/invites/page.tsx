import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Flash } from "@/components/ui";
import { invitePublisherAction, revokeInviteAction } from "@/app/actions/admin";
import { emailEnabled } from "@/lib/email";

export default async function AdminInvites({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  await requireRole("admin");
  const invites = await prisma.invite.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="h2 mb-1">Publisher invites</h1>
      <p className="muted mb-6">Publishers can only join by invite. Enter an email to send one.</p>
      <Flash searchParams={searchParams} />

      <form action={invitePublisherAction} className="card mb-6 flex items-end gap-3">
        <label className="field mb-0 flex-1">
          <span>Publisher email</span>
          <input className="input" type="email" name="email" placeholder="publisher@example.com" required />
        </label>
        <button className="btn-primary" type="submit">Send invite</button>
      </form>
      {!emailEnabled() && (
        <p className="flash flash-info">Email isn&apos;t configured, so the invite link will be shown here after you create it — copy and send it manually.</p>
      )}

      <div className="card overflow-x-auto">
        <table className="table-wt">
          <thead><tr><th>Email</th><th>Status</th><th>Expires</th><th></th></tr></thead>
          <tbody>
            {invites.length === 0 && (<tr><td colSpan={4} className="muted">No invites yet.</td></tr>)}
            {invites.map((i) => (
              <tr key={i.id}>
                <td className="font-semibold">{i.email}</td>
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
