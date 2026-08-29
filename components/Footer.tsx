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

const SOCIALS: { label: string; href: string; icon: JSX.Element }[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/welcome_tomorrow/",
    icon: (
      <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.42 2.21 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5 0-4.74.07-.9.04-1.38.19-1.7.32-.43.16-.73.36-1.05.68-.32.32-.52.62-.68 1.05-.13.32-.28.8-.32 1.7C3.44 8.5 3.43 8.85 3.43 12s0 3.5.07 4.74c.04.9.19 1.38.32 1.7.16.43.36.73.68 1.05.32.32.62.52 1.05.68.32.13.8.28 1.7.32 1.24.06 1.59.07 4.74.07s3.5 0 4.74-.07c.9-.04 1.38-.19 1.7-.32.43-.16.73-.36 1.05-.68.32-.32.52-.62.68-1.05.13-.32.28-.8.32-1.7.06-1.24.07-1.59.07-4.74s0-3.5-.07-4.74c-.04-.9-.19-1.38-.32-1.7a2.83 2.83 0 0 0-.68-1.05 2.83 2.83 0 0 0-1.05-.68c-.32-.13-.8-.28-1.7-.32C15.5 4 15.15 4 12 4Zm0 3.06A4.94 4.94 0 1 1 12 16.94 4.94 4.94 0 0 1 12 7.06Zm0 8.14A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4Zm6.3-8.34a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z" />
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/welcometomorrowagency",
    icon: (
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/wtglobal/",
    icon: (
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.83v1.64h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21H9V9Z" />
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@welcome.tomorrow",
    icon: (
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.2v12.6a2.6 2.6 0 1 1-2.6-2.6c.27 0 .53.04.78.12v-3.3a5.9 5.9 0 0 0-.78-.05 5.9 5.9 0 1 0 5.9 5.9V9.01a7.5 7.5 0 0 0 4.36 1.4V7.2a4.28 4.28 0 0 1-3.4-1.38Z" />
    ),
  },
  {
    label: "Newsletter",
    href: "https://newsletter.welcometomorrow.io/",
    icon: (
      <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm.9 2 7.1 5.05L19.1 7H4.9Zm14.1 1.6-6.42 4.57a1 1 0 0 1-1.16 0L5 8.6V17h14V8.6Z" />
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
            <div className="mt-8 flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-black transition-transform hover:scale-110"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                    {s.icon}
                  </svg>
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
          <a href={`${SITE}/legal-notice/`} className="hover:text-white">Legal information</a>
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
