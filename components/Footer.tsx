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

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="container-wt py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Welcome Tomorrow" className="h-9 w-auto" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              Moving away from traditional marketing agencies, Welcome Tomorrow sets new
              standards as your trusted growth partner.
            </p>
            <div className="mt-5 flex gap-4 text-sm text-white/70">
              <a href="https://instagram.com" className="hover:text-white">Instagram</a>
              <a href="https://facebook.com" className="hover:text-white">Facebook</a>
              <a href="https://linkedin.com" className="hover:text-white">LinkedIn</a>
              <a href="https://tiktok.com" className="hover:text-white">TikTok</a>
            </div>
          </div>

          <FooterCol title="Company" items={COMPANY} />
          <FooterCol title="Services" items={SERVICES} />
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/50">Expertise</h4>
            <ul className="space-y-2 text-sm text-white/70">
              {EXPERTISE.map((e) => (
                <li key={e}>
                  <a href={`${SITE}/`} className="hover:text-white">{e}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center">
          <span>Copyright © {new Date().getFullYear()} Welcome Tomorrow, all rights reserved</span>
          <span>Cape Town · Nairobi · Lagos</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/50">{title}</h4>
      <ul className="space-y-2 text-sm text-white/70">
        {items.map((i) => (
          <li key={i.label}>
            <a href={i.href} className="hover:text-white">{i.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
