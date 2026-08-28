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
  // Keep the deploy pipeline resilient for non-developer redeploys.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
module.exports = nextConfig;
