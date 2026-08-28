import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { Flash } from "@/components/ui";
import { savePayoutAction } from "@/app/actions/listings";

export default async function DashboardPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const user = await requireUser();

  return (
    <div>
      <h1 className="h2 mb-1">Dashboard</h1>
      <p className="muted mb-6">Signed in as {user.name} · {user.role}</p>
      <Flash searchParams={searchParams} />

      {user.role === "buyer" && <BuyerDash userId={user.id} balance={user.balanceCents} />}
      {user.role === "publisher" && <PublisherDash userId={user.id} payoutBank={user.payoutBank} />}
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

async function PublisherDash({ userId, payoutBank }: { userId: number; payoutBank: string | null }) {
  const [sites, toFulfill] = await Promise.all([
    prisma.listing.count({ where: { publisherId: userId } }),
    prisma.order.count({ where: { listing: { publisherId: userId }, status: "funded" } }),
  ]);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="grid gap-5">
        <div className="card"><p className="muted text-sm">My sites</p><p className="text-3xl font-bold">{sites}</p><div className="mt-4 flex gap-2"><Link href="/my-listings" className="btn-ghost btn-sm">Manage</Link><Link href="/new-listing" className="btn-primary btn-sm">Add a site</Link></div></div>
        <div className="card"><p className="muted text-sm">Orders to fulfil</p><p className="text-3xl font-bold">{toFulfill}</p><Link href="/orders" className="btn-ghost btn-sm mt-4">View orders</Link></div>
      </div>
      <div className="card">
        <h2 className="h3 mb-2">Payout details</h2>
        <p className="muted mb-4 text-sm">Where should the admin send your earnings? (Bank or PayPal)</p>
        <form action={savePayoutAction}>
          <label className="field">
            <span>Payout account</span>
            <input className="input" name="payoutBank" defaultValue={payoutBank || ""} placeholder="Bank name + account, or PayPal email" />
          </label>
          <button className="btn-primary btn-sm" type="submit">Save</button>
        </form>
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
