import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export default async function AdminHome() {
  await requireRole("admin");
  const [users, publishers, pending, orders, funded, invites] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "publisher" } }),
    prisma.listing.count({ where: { status: "pending" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "funded" } }),
    prisma.invite.count({ where: { acceptedAt: null } }),
  ]);

  const cards = [
    { href: "/admin/listings", label: "Review listings", value: pending, hint: "pending" },
    { href: "/admin/orders", label: "Orders", value: orders, hint: `${funded} funded` },
    { href: "/admin/invites", label: "Publisher invites", value: invites, hint: "open" },
    { href: "/admin/users", label: "Users", value: users, hint: `${publishers} publishers` },
  ];

  return (
    <div>
      <h1 className="h2 mb-1">Admin</h1>
      <p className="muted mb-6">Manage the marketplace.</p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card hover:border-wt-green/50">
            <p className="muted text-sm">{c.label}</p>
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="muted text-xs">{c.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
