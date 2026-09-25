import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

/**
 * Every admin action, newest first. Read-only: nothing in the app edits or
 * deletes these rows, so the record can be trusted when a question comes up
 * about who marked something paid or who removed an account.
 */
export default async function AdminAuditPage() {
  await requireRole("admin");
  const rows = await prisma.adminAudit.findMany({ orderBy: { createdAt: "desc" }, take: 300 });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h2">Audit log</h1>
          <p className="muted mt-1 max-w-2xl text-sm">
            Every action taken in the admin area, and every admin sign-in, with who did it and when.
            The latest 300 are shown. Times are UTC.
          </p>
        </div>
        <Link href="/admin" className="btn-ghost btn-sm">← Admin</Link>
      </div>
      {rows.length === 0 ? (
        <div className="card muted">Nothing recorded yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-wt">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="muted whitespace-nowrap">{r.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                  <td>{r.adminEmail}</td>
                  <td className="font-semibold">{r.action.replace(/Action$/, "")}</td>
                  <td className="muted break-all text-xs">{[r.target, r.detail].filter(Boolean).join(" · ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
