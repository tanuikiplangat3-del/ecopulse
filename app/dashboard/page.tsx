import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { Flash } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireUser();

  return (
    <div>
      <h1 className="h2 mb-1">Dashboard</h1>
      <p className="muted mb-6">Signed in as {user.name}, {user.role}</p>
      <Flash searchParams={searchParams} />

      {user.role === "buyer" && <BuyerDash userId={user.id} balance={user.balanceCents} />}
      {user.role === "publisher" && <PublisherDash user={user} />}
      {user.role === "admin" && <AdminDash />}
    </div>
  );
}

async function BuyerDash({ userId, balance }: { userId: number; balance: number }) {
  const [orders, active] = await Promise.all([
    prisma.order.count({ where: { buyerId: userId } }),
    prisma.order.count({ where: { buyerId: userId, status: { in: ["pending_payment", "funded", "live"] } } }),
  ]);
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <div className="card"><p className="muted text-sm">Wallet balance</p><p className="text-3xl font-bold text-wt-green">{money(balance)}</p><Link href="/topup" className="btn-ghost btn-sm mt-4">Top up</Link></div>
      <div className="card"><p className="muted text-sm">Total orders</p><p className="text-3xl font-bold">{orders}</p><Link href="/orders" className="btn-ghost btn-sm mt-4">View orders</Link></div>
      <div className="card"><p className="muted text-sm">Active orders</p><p className="text-3xl font-bold">{active}</p><Link href="/marketplace" className="btn-primary btn-sm mt-4">Browse sites</Link></div>
    </div>
  );
}

async function PublisherDash({ user }: { user: any }) {
  const [sites, toFulfill, earnedAgg] = await Promise.all([
    prisma.listing.count({ where: { publisherId: user.id } }),
    prisma.order.count({ where: { listing: { publisherId: user.id }, status: "funded" } }),
    prisma.order.aggregate({ _sum: { payoutCents: true }, where: { listing: { publisherId: user.id }, status: "completed" } }),
  ]);
  const earned = earnedAgg._sum.payoutCents || 0;
  const withdrawn = user.withdrawnCents || 0;
  const available = Math.max(earned - withdrawn, 0);
  const hasPayout = !!(user.payMethod || user.payMpesa || user.payBank || user.payPaypal);

  return (
    <div>
      <div className="mb-5 flash flash-info">
        All payments for all orders are paid weekly on Tuesday. Any payment not received by
        then, contact seo@welcometomorrow.io immediately to be resolved.
      </div>

      {!hasPayout && (
        <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 border-wt-yellow/40 bg-wt-yellow/10">
          <span className="text-sm">Add your payment details so we can pay your earnings.</span>
          <Link href="/payout" className="btn-accent btn-sm">Add payment details</Link>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="card"><p className="muted text-sm">Available balance</p><p className="text-3xl font-bold text-wt-green">{money(available)}</p><Link href="/payout" className="btn-ghost btn-sm mt-4">Payment details</Link></div>
        <div className="card"><p className="muted text-sm">Total received</p><p className="text-3xl font-bold">{money(withdrawn)}</p></div>
        <div className="card"><p className="muted text-sm">Total earned</p><p className="text-3xl font-bold">{money(earned)}</p></div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="card"><p className="muted text-sm">Your websites</p><p className="text-3xl font-bold">{sites}</p><div className="mt-4 flex gap-2"><Link href="/my-listings" className="btn-ghost btn-sm">Manage</Link><Link href="/new-listing" className="btn-primary btn-sm">Add a website</Link></div></div>
        <div className="card"><p className="muted text-sm">Orders to fulfil</p><p className="text-3xl font-bold">{toFulfill}</p><Link href="/orders" className="btn-ghost btn-sm mt-4">View orders</Link></div>
      </div>
    </div>
  );
}

async function AdminDash() {
  const [users, pending, orders, invites] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count({ where: { status: "pending" } }),
    prisma.order.count(),
    prisma.invite.count({ where: { acceptedAt: null } }),
  ]);
  return (
    <div className="grid gap-5 md:grid-cols-4">
      <Link href="/admin/users" className="card hover:border-wt-green/50"><p className="muted text-sm">Users</p><p className="text-3xl font-bold">{users}</p></Link>
      <Link href="/admin/listings" className="card hover:border-wt-green/50"><p className="muted text-sm">Pending listings</p><p className="text-3xl font-bold text-wt-yellow">{pending}</p></Link>
      <Link href="/admin/orders" className="card hover:border-wt-green/50"><p className="muted text-sm">Orders</p><p className="text-3xl font-bold">{orders}</p></Link>
      <Link href="/admin/invites" className="card hover:border-wt-green/50"><p className="muted text-sm">Open invites</p><p className="text-3xl font-bold">{invites}</p></Link>
    </div>
  );
}
