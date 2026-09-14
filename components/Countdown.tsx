"use client";

import { useEffect, useState } from "react";

/**
 * Live turnaround countdown.
 *
 * The deadline is computed on the server and passed in as an ISO string, so
 * every viewer counts down to the same instant no matter what their computer
 * clock says. Only the display ticks here.
 *
 * Going past zero does not cancel anything by itself - lib/order-scheduler.ts
 * does that within five minutes - so the label says "overdue" rather than
 * claiming the order is already gone.
 */
export default function Countdown({
  dueAt,
  className = "",
}: {
  dueAt: string;
  className?: string;
}) {
  const target = new Date(dueAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // First server render and first client render must match, so nothing is shown
  // until the effect has run. A hydration mismatch here would blank the card.
  if (now === null) return <span className={className}>&nbsp;</span>;

  const ms = target - now;
  const over = ms <= 0;
  let s = Math.floor(Math.abs(ms) / 1000);
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const body =
    d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m`
    : h > 0 ? `${pad(h)}h ${pad(m)}m ${pad(s)}s`
    : `${pad(m)}m ${pad(s)}s`;

  // Under a day is the point where a publisher needs to feel it.
  const tone = over ? "text-wt-red" : ms < 86400_000 ? "text-wt-yellow" : "text-wt-green";

  return (
    <span className={`${tone} font-bold tabular-nums ${className}`}>
      {over ? `${body} overdue` : body}
    </span>
  );
}
