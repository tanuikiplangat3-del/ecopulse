import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { StatusBadge } from "@/components/ui";

export const metadata = { title: "Publisher requests" };

export default async function AdminApplications() {
  await requireRole("admin");
  const apps = await prisma.publisherApplication.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="h2 mb-1">Publisher requests</h1>
      <p className="muted mb-6">People who asked to be listed on the marketplace.</p>

      {apps.length === 0 ? (
        <div className="card muted">No requests yet.</div>
      ) : (
        <div className="space-y-4">
          {apps.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{a.name}</p>
                  <p className="muted text-sm">
                    <a href={`mailto:${a.email}`} className="text-wt-green hover:underline">{a.email}</a>
                    {" · "}{a.createdAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <StatusBadge status={a.status === "new" ? "pending" : a.status} />
              </div>
              <div className="mt-3">
                <p className="muted text-xs">Websites for review</p>
                <pre className="whitespace-pre-wrap break-words text-sm text-white/85">{a.urls}</pre>
              </div>
              {a.note && (
                <div className="mt-2">
                  <p className="muted text-xs">Note</p>
                  <p className="text-sm text-white/80">{a.note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
