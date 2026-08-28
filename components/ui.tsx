import Link from "next/link";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "badge-green",
    completed: "badge-green",
    live: "badge-blue",
    funded: "badge-blue",
    pending: "badge-yellow",
    pending_payment: "badge-yellow",
    open: "badge-yellow",
    rejected: "badge-red",
    cancelled: "badge-red",
    closed: "badge-muted",
  };
  const label = status.replace(/_/g, " ");
  return <span className={`badge ${map[status] || "badge-muted"}`}>{label}</span>;
}

export function Flash({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sp = searchParams || {};
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const err = get("error");
  const ok = get("success") || (get("paid") ? "Payment received - thank you!" : undefined);
  const info = get("cancelled") ? "Payment cancelled. You can try again anytime." : undefined;
  return (
    <>
      {err && <div className="flash flash-error">{err}</div>}
      {ok && <div className="flash flash-success">{ok}</div>}
      {info && <div className="flash flash-info">{info}</div>}
    </>
  );
}

export function EmptyState({ title, hint, cta }: { title: string; hint?: string; cta?: { href: string; label: string } }) {
  return (
    <div className="card text-center">
      <p className="text-lg font-semibold">{title}</p>
      {hint && <p className="muted mt-1">{hint}</p>}
      {cta && (
        <Link href={cta.href} className="btn-primary mt-4">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h2">{title}</h1>
        {subtitle && <p className="muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
