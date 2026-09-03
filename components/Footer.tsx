import Link from "next/link";

const SITE = "https://welcometomorrow.io";
const LOGO = "https://welcometomorrow.io/wp-content/uploads/2025/07/WT-logo-white.svg";

const COMPANY = [
  { label: "Contact Us", href: `${SITE}/contact-us/` },
  { label: "About us", href: `${SITE}/about-us/` },
  { label: "Blog", href: `${SITE}/blog/` },
  { label: "Join Us", href: `${SITE}/join-us/` },
  { label: "App Marketing | South Africa", href: `${SITE}/` },
];
const SERVICES = [
  { label: "Performance Marketing", href: `${SITE}/performance-marketing-agency/` },
  { label: "Organic Growth", href: `${SITE}/social-media-marketing-agency/` },
  { label: "Creative Studio", href: `${SITE}/creative-agency/` },
  { label: "Marketing Analytics", href: `${SITE}/marketing-analytics/` },
];
const EXPERTISE = [
  "Sports Betting", "Fintech", "Retail", "Healthcare", "B2B", "Banking", "Travel",
];

const DARK = "#0b0f0d";
const SOCIALS: { label: string; href: string; icon: JSX.Element }[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/welcome_tomorrow/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="#fff" strokeWidth="1.7" aria-hidden>
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="#fff" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/welcometomorrowagency",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
        <rect width="24" height="24" rx="5.5" fill="#fff" />
        <path fill={DARK} d="M15.6 8.3h-1.4c-.5 0-.85.35-.85.9v1.3h2.2l-.3 2.2h-1.9V19h-2.25v-6.3H9.2v-2.2h1.9V9.1c0-1.8 1.1-3 2.9-3h1.6v2.2Z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/wtglobal/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
        <rect width="24" height="24" rx="5.5" fill="#fff" />
        <path fill={DARK} d="M8.2 9.9H6.1V18h2.1V9.9Zm.16-2.1a1.22 1.22 0 1 0-2.44 0 1.22 1.22 0 0 0 2.44 0ZM18.1 18v-4.55c0-2.2-.47-3.9-3.04-3.9-1.23 0-2.06.68-2.4 1.32h-.03V9.9h-2.03V18h2.11v-4.02c0-.88.17-1.73 1.26-1.73 1.08 0 1.09 1.01 1.09 1.79V18h2.04Z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@welcome.tomorrow",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#fff" aria-hidden>
        <path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.2v12.6a2.6 2.6 0 1 1-2.6-2.6c.27 0 .53.04.78.12v-3.3a5.9 5.9 0 0 0-.78-.05 5.9 5.9 0 1 0 5.9 5.9V9.01a7.5 7.5 0 0 0 4.36 1.4V7.2a4.28 4.28 0 0 1-3.4-1.38Z" />
      </svg>
    ),
  },
  {
    label: "Substack",
    href: "https://newsletter.welcometomorrow.io/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#fff" aria-hidden>
        <path d="M4 3.5h16V6H4V3.5Z" />
        <path d="M4 8h16v2.5H4V8Z" />
        <path d="M4 12.4 12 17l8-4.6V21l-8-4.6L4 21v-8.6Z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="container-wt py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Welcome Tomorrow" className="h-12 w-auto" />
            <p className="mt-8 max-w-sm text-[15px] font-bold leading-relaxed text-white">
              Moving away from traditional marketing agencies, Welcome Tomorrow sets new
              standards as your trusted growth partner.
            </p>
            <p className="mt-5 max-w-sm text-[15px] font-bold leading-relaxed text-white">
              We operate across the continent, with our main offices located in
              Cape Town, Nairobi, and Lagos
            </p>
            <div className="mt-8 flex items-center gap-4">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="transition-transform hover:scale-110"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Company" items={COMPANY} />
          <FooterCol title="Services" items={SERVICES} />
          <div>
            <h4 className="mb-6 text-xl font-bold text-white">Expertise</h4>
            <ul className="space-y-4 text-[15px] font-bold text-white">
              {EXPERTISE.map((e) => (
                <li key={e}>
                  <a href={`${SITE}/`} className="transition-colors hover:text-wt-green">{e}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center">
          <span>Copyright © {new Date().getFullYear()} Welcome Tomorrow, all rights reserved</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            <Link href="/refund" className="hover:text-white">Refund Policy</Link>
            <a href={`${SITE}/legal-notice/`} className="hover:text-white">Legal information</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="mb-6 text-xl font-bold text-white">{title}</h4>
      <ul className="space-y-4 text-[15px] font-bold text-white">
        {items.map((i) => (
          <li key={i.label}>
            <a href={i.href} className="transition-colors hover:text-wt-green">{i.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
