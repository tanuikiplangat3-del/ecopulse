export default function Footer() {
  return (
    <footer className="mt-20 border-t border-wt-border py-10">
      <div className="container-wt flex flex-col items-center justify-between gap-3 text-sm text-white/50 sm:flex-row">
        <span>© {new Date().getFullYear()} Welcome Tomorrow Ecopulse — Link Building Marketplace</span>
        <span className="text-white/40">Buy &amp; sell quality backlinks and guest posts</span>
      </div>
    </footer>
  );
}
