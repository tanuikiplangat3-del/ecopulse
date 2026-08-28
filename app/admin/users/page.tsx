import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/money";

export default async function AdminUsers() {
  await requireRole("admin");
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="h2 mb-1">Users</h1>
      <p className="muted mb-6">Everyone with an account.</p>
      <div className="card overflow-x-auto">
        <table className="table-wt">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Balance</th><th>Verified</th><th>Joined</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.name}</td>
                <td className="muted">{u.email}</td>
                <td>
                  <span className={`badge ${u.role === "admin" ? "badge-yellow" : u.role === "publisher" ? "badge-blue" : "badge-muted"}`}>{u.role}</span>
                </td>
                <td>{u.role === "buyer" ? money(u.balanceCents) : "—"}</td>
                <td>{u.verified ? "✓" : "—"}</td>
                <td className="muted">{u.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
