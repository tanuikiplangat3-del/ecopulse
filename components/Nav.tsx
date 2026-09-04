import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/money";
import LogoReveal from "@/components/LogoReveal";

export default async function Nav() {
  const u = await getCurrentUser();
  // The public home page is only for signed-out visitors. Signed-in users land
  // on the surface that belongs to their role when they click the logo.
  const homeHref = !u ? "/" : u.role === "buyer" ? "/marketplace" : "/dashboard";
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-gradient-to-b from-black/85 via-black/40 to-transparent backdrop-blur-[2px]">
      <div className="container-wt flex h-20 items-center justify-between gap-4">
        <Link href={homeHref} className="flex items-center" aria-label="Welcome Tomorrow">
          {/* The one logo on the site. It reveals itself once per visitor and is
              simply there on every visit after that. */}
          <LogoReveal />
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
                <>
                  <Link href="/request-site" className="text-white/85 hover:text-white">
                    Request a site
                  </Link>
                  <Link href="/topup" className="text-white/85 hover:text-white">
                    Balance: {money(u.balanceCents)}
                  </Link>
                </>
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
              <a href="/linktomorrow/logout" className="btn-ghost btn-sm">
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
