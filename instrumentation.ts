// Runs once when the Next.js server process starts (not during the build).
// Kicks off the weekly Domain Rating refresh and the turnaround auto-cancel
// sweep. Both are in-app schedulers - no AWS cron, no public endpoint.

export async function register() {
  // Only the Node.js server runtime - never the edge runtime or the build step.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startMetricsScheduler } = await import("@/lib/metrics-scheduler");
  startMetricsScheduler();
  const { startOrderScheduler } = await import("@/lib/order-scheduler");
  startOrderScheduler();
}
