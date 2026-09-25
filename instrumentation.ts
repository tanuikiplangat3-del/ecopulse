// Runs once when the Next.js server process starts (not during the build).
// Kicks off the weekly Domain Rating refresh and the turnaround auto-cancel
// sweep. Both are in-app schedulers - no AWS cron, no public endpoint.

export async function register() {
  // Only the Node.js server runtime - never the edge runtime or the build step.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Next.js 16 can load this file while collecting page data during
  // `next build`. There is no database then, so the schedulers must not start.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startMetricsScheduler } = await import("@/lib/metrics-scheduler");
  startMetricsScheduler();
  const { startOrderScheduler } = await import("@/lib/order-scheduler");
  startOrderScheduler();
}
