import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/money";

const LOGO = "https://welcometomorrow.io/wp-content/uploads/2025/07/WT-logo-white.svg";

type Item = {
  href: string;
  label: string;
  /** Rendered as an outline button rather than a plain link. */
  cta?: boolean;
  /** Full page load rather than a client transition (logout clears the cookie). */
  hard?: boolean;
  /** Highlighted, for the admin entry. */
  accent?: boolean;
};

export default async function Nav() {
  const u = await getCurrentUser();
  // The public home page is only for signed-out visitors. Signed-in users land
  // on the surface that belongs to their role when they click the logo.
  const homeHref = !u ? "/" : u.role === "buyer" ? "/marketplace" : "/dashboard";

  // Built once and rendered twice - inline on desktop, stacked in the phone
  // menu. Keeping one list is what stops the two from drifting apart as roles
  // gain and lose links.
  const items: Item[] = [];
  if (!u || u.role !== "publisher") items.push({ href: "/marketplace", label: "Marketplace" });
  if (u) {
    items.push({ href: "/dashboard", label: "Dashboard" });
    if (u.role === "publisher") {
      items.push({ href: "/my-listings", label: "Websites" });
      items.push({ href: "/payout", label: "Payment details" });
    }
    if (u.role === "buyer") {
      items.push({ href: "/request-site", label: "Invite publisher" });
      items.push({ href: "/topup", label: `Balance: ${money(u.balanceCents)}` });
    }
    items.push({ href: "/orders", label: "Orders" });
    if (u.role === "admin") items.push({ href: "/admin", label: "Admin", accent: true });
    items.push({ href: "/linktomorrow/logout", label: "Sign out", cta: true, hard: true });
  } else {
    items.push({ href: "/login", label: "Sign in" });
    items.push({ href: "/register", label: "Get started", cta: true });
  }

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-black/85 via-black/40 to-transparent backdrop-blur-[2px]">
      {/* Header geometry from the Figma menu component (node 1544:5188): an 84px
          row with the logo at its full height and nav labels Outfit Bold 16px.
          Stepped down on phones so the sticky bar does not eat the viewport. */}
      <div className="container-wt relative flex h-[64px] items-center justify-between gap-4 md:h-[84px]">
        <Link href={homeHref} className="flex items-center" aria-label="Welcome Tomorrow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Welcome Tomorrow" className="h-[44px] w-auto md:h-[62px]" />
        </Link>

        {/* Desktop: everything inline. */}
        <nav className="hidden items-center gap-x-6 text-[16px] font-bold md:flex">
          {u && (
            <span className="hidden text-white/50 lg:inline" title={u.email}>
              {u.name}
            </span>
          )}
          {items.map((i) => (
            <NavLink key={i.href} item={i} />
          ))}
        </nav>

        {/* Phone: a menu button. This is a plain <details> disclosure rather
            than a React state toggle - no JavaScript to download, it works
            before the page has finished loading, and there is no hydration to
            go wrong. Tapping the button opens the panel below. */}
        <details className="md:hidden [&[open]_.bar-top]:translate-y-[6px] [&[open]_.bar-top]:rotate-45 [&[open]_.bar-mid]:opacity-0 [&[open]_.bar-bot]:-translate-y-[6px] [&[open]_.bar-bot]:-rotate-45">
          <summary
            className="flex h-[44px] w-[44px] cursor-pointer list-none items-center justify-center rounded-sm border-2 border-white [&::-webkit-details-marker]:hidden"
            aria-label="Menu"
          >
            <span className="flex flex-col gap-[4px]">
              <span className="bar-top block h-[2px] w-[20px] bg-white transition-transform" />
              <span className="bar-mid block h-[2px] w-[20px] bg-white transition-opacity" />
              <span className="bar-bot block h-[2px] w-[20px] bg-white transition-transform" />
            </span>
          </summary>

          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-md border border-white/15 bg-black/95 p-2 shadow-card backdrop-blur">
            {u && (
              <p className="border-b border-white/10 px-3 py-3 text-[14px] text-white/50">
                Signed in as {u.name}
              </p>
            )}
            {items.map((i) =>
              i.cta ? (
                <div key={i.href} className="px-2 pb-2 pt-3">
                  <NavLink item={i} className="btn-ghost w-full" />
                </div>
              ) : (
                <NavLink
                  key={i.href}
                  item={i}
                  className={`block border-b border-white/10 px-3 py-4 text-[16px] font-bold last:border-0 ${
                    i.accent ? "text-wt-yellow" : "text-white"
                  }`}
                />
              )
            )}
          </div>
        </details>
      </div>
    </header>
  );
}

function NavLink({ item, className }: { item: Item; className?: string }) {
  const cls =
    className ??
    (item.cta
      ? "btn-ghost"
      : item.accent
        ? "text-wt-yellow hover:brightness-110"
        : "text-white/85 hover:text-white");

  // Signing out must hit the server route directly, so it stays a plain anchor.
  if (item.hard) {
    return (
      <a href={item.href} className={cls}>
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={cls}>
      {item.label}
    </Link>
  );
}
