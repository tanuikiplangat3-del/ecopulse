/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Served under tools.welcometomorrow.io/ecopulse (sibling of /ranktomorrow)
  basePath: "/ecopulse",
  // Self-contained server build for a small Docker image (matches ranktomorrow)
  output: "standalone",
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Allow buyers to upload a featured image + guest-post document with an order.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
    // Runs instrumentation.ts once on server start (weekly DR + traffic refresh).
    instrumentationHook: true,
  },
  // Keep the deploy pipeline resilient for non-developer redeploys.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
module.exports = nextConfig;
