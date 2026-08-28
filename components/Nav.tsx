import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/money";

export default async function Nav() {
  const u = await getCurrentUser();
  return (
    <header className="sticky top-0 z-50 border-b border-wt-border bg-black/80 backdrop-blur">
      <div className="container-wt flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="inline-block h-3 w-3 rounded-full bg-wt-green" />
          <span className="text-sm sm:text-base">
            Welcome Tomorrow <span className="text-wt-green">Ecopulse</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {(!u || u.role !== "publisher") && (
            <Link href="/marketplace" className="text-white/80 hover:text-white">
              Marketplace
            </Link>
          )}
          {u && (
            <>
              <Link href="/dashboard" className="text-white/80 hover:text-white">
                Dashboard
              </Link>
              {u.role === "publisher" && (
                <Link href="/my-listings" className="text-white/80 hover:text-white">
                  My sites
                </Link>
              )}
              {u.role === "buyer" && (
                <Link href="/topup" className="text-white/80 hover:text-white">
                  Balance: {money(u.balanceCents)}
                </Link>
              )}
              <Link href="/orders" className="text-white/80 hover:text-white">
                Orders
              </Link>
              {u.role === "admin" && (
                <Link href="/admin" className="text-wt-yellow hover:brightness-110">
                  Admin
                </Link>
              )}
              <span className="hidden text-white/50 sm:inline" title={u.email}>
                {u.name}
              </span>
              <a href="/ecopulse/logout" className="btn-ghost btn-sm">
                Sign out
              </a>
            </>
          )}
          {!u && (
            <>
              <Link href="/login" className="text-white/80 hover:text-white">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
