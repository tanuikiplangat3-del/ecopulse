// Runs once when the Next.js server process starts (not during the build).
// Used to kick off the weekly DR + traffic refresh.

export async function register() {
  // Only the Node.js server runtime - never the edge runtime or the build step.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startMetricsScheduler } = await import("@/lib/metrics-scheduler");
  startMetricsScheduler();
}
