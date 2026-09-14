import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/money";
import { Flash } from "@/components/ui";
import { deleteUserAction } from "@/app/actions/admin";
import { FOUNDER_BUYER_LIMIT } from "@/lib/money";

export const metadata = { title: "Users" };

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const me = await requireRole("admin");
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  const publishers = users.filter((u) => u.role === "publisher");
  const buyers = users.filter((u) => u.role === "buyer");
  const admins = users.filter((u) => u.role === "admin");
  const founders = users.filter((u) => u.founderNumber !== null).length;
  // Publishers a buyer brought in through a link, so the pricing on their sites
  // is visible from here rather than only in the database.
  const buyerById = new Map<number, any>(users.map((u) => [u.id, u]));

  return (
    <div>
      <h1 className="h2 mb-1">Users</h1>
      <p className="muted mb-6">
        Publishers and buyers, kept separate. {founders} of {FOUNDER_BUYER_LIMIT} founding
        buyer places taken. Founding buyers see the whole marketplace without depositing,
        for life.
      </p>
      <Flash searchParams={searchParams} />

      <Section title="Publishers" count={publishers.length}>
        <UserTable users={publishers} meId={me.id} kind="publisher" buyerById={buyerById} />
      </Section>

      <Section title="Buyers" count={buyers.length}>
        <UserTable users={buyers} meId={me.id} kind="buyer" buyerById={buyerById} />
      </Section>

      <Section title="Admins" count={admins.length}>
        <UserTable users={admins} meId={me.id} kind="admin" buyerById={buyerById} />
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="h3 mb-3">{title} <span className="muted text-base font-normal">({count})</span></h2>
      {children}
    </div>
  );
}

function UserTable({
  users,
  meId,
  kind,
  buyerById,
}: {
  users: any[];
  meId: number;
  kind: string;
  buyerById: Map<number, any>;
}) {
  if (users.length === 0) return <div className="card muted">None yet.</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="table-wt">
        <thead>
          <tr>
            <th>Name</th><th>Email</th>
            {kind === "buyer" && <th>Balance</th>}
            {kind === "buyer" && <th>Founding</th>}
            {kind === "publisher" && <th>Brought in by</th>}
            <th>Verified</th><th>Joined</th><th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="font-semibold">
                {u.role === "publisher" ? (
                  <Link href={`/admin/users/${u.id}`} className="text-wt-green hover:underline">{u.name}</Link>
                ) : (
                  u.name
                )}
              </td>
              <td className="muted">{u.email}</td>
              {kind === "buyer" && <td>{money(u.balanceCents)}</td>}
              {kind === "buyer" && (
                <td>
                  {u.founderNumber !== null ? (
                    <span className="badge badge-green">#{u.founderNumber}</span>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
              )}
              {kind === "publisher" && (
                <td className="muted">
                  {u.invitedByBuyerId
                    ? buyerById.get(u.invitedByBuyerId)?.name || `buyer #${u.invitedByBuyerId}`
                    : "-"}
                </td>
              )}
              <td>{u.verified ? "✓" : "-"}</td>
              <td className="muted">{u.createdAt.toISOString().slice(0, 10)}</td>
              <td className="text-right">
                {u.id !== meId && (
                  <form action={deleteUserAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className="btn-danger btn-sm">Delete</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
