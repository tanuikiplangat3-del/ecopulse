import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/money";

const LOGO = "https://welcometomorrow.io/wp-content/uploads/2025/07/WT-logo-white.svg";

export default async function Nav() {
  const u = await getCurrentUser();
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-gradient-to-b from-black/85 via-black/40 to-transparent backdrop-blur-[2px]">
      <div className="container-wt flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label="Welcome Tomorrow home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Welcome Tomorrow" className="h-8 w-auto" />
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold">
          {(!u || u.role !== "publisher") && (
            <Link href="/marketplace" className="text-white/85 hover:text-white">
              Marketplace
            </Link>
          )}
          {u && (
            <>
              <Link href="/dashboard" className="text-white/85 hover:text-white">
                Dashboard
              </Link>
              {u.role === "publisher" && (
                <>
                  <Link href="/my-listings" className="text-white/85 hover:text-white">
                    Websites
                  </Link>
                  <Link href="/payout" className="text-white/85 hover:text-white">
                    Payment details
                  </Link>
                </>
              )}
              {u.role === "buyer" && (
                <Link href="/topup" className="text-white/85 hover:text-white">
                  Balance: {money(u.balanceCents)}
                </Link>
              )}
              <Link href="/orders" className="text-white/85 hover:text-white">
                Orders
              </Link>
              {u.role === "admin" && (
                <Link href="/admin" className="text-wt-yellow hover:brightness-110">
                  Admin
                </Link>
              )}
              <span className="hidden text-white/50 lg:inline" title={u.email}>
                {u.name}
              </span>
              <a href="/ecopulse/logout" className="btn-ghost btn-sm">
                Sign out
              </a>
            </>
          )}
          {!u && (
            <>
              <Link href="/login" className="text-white/85 hover:text-white">
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
