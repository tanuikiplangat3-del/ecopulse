import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/money";
import { Flash } from "@/components/ui";
import { deleteUserAction } from "@/app/actions/admin";

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

  return (
    <div>
      <h1 className="h2 mb-1">Users</h1>
      <p className="muted mb-6">Publishers and buyers, kept separate.</p>
      <Flash searchParams={searchParams} />

      <Section title="Publishers" count={publishers.length}>
        <UserTable users={publishers} meId={me.id} kind="publisher" />
      </Section>

      <Section title="Buyers" count={buyers.length}>
        <UserTable users={buyers} meId={me.id} kind="buyer" />
      </Section>

      <Section title="Admins" count={admins.length}>
        <UserTable users={admins} meId={me.id} kind="admin" />
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

function UserTable({ users, meId, kind }: { users: any[]; meId: number; kind: string }) {
  if (users.length === 0) return <div className="card muted">None yet.</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="table-wt">
        <thead>
          <tr>
            <th>Name</th><th>Email</th>
            {kind === "buyer" && <th>Balance</th>}
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
