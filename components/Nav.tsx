import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/money";

const LOGO = "https://welcometomorrow.io/wp-content/uploads/2025/07/WT-logo-white.svg";

export default async function Nav() {
  const u = await getCurrentUser();
  // The public home page is only for signed-out visitors. Signed-in users land
  // on the surface that belongs to their role when they click the logo.
  const homeHref = !u ? "/" : u.role === "buyer" ? "/marketplace" : "/dashboard";
  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-black/85 via-black/40 to-transparent backdrop-blur-[2px]">
      {/* Header geometry taken from the Figma menu component (node 1544:5188):
          an 84px row, logo occupying its full height, nav labels Outfit Bold
          16px. Stepped down on phones so the sticky bar does not eat the
          viewport - the artboard is desktop-only. */}
      <div className="container-wt flex h-[64px] items-center justify-between gap-4 md:h-[84px]">
        <Link href={homeHref} className="flex items-center" aria-label="Welcome Tomorrow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Welcome Tomorrow" className="h-[48px] w-auto md:h-[84px]" />
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[16px] font-bold">
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
              {/* The Figma header CTA ("LET'S TALK", node 1544:5171) is a
                  177x50 outline button with a 2px white border, not a filled
                  pill - so the signed-out CTA now matches it. */}
              <Link href="/register" className="btn-ghost">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
