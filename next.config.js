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
  // Don't let lint warnings block the first build; type-checking stays on.
  eslint: { ignoreDuringBuilds: true },
};
module.exports = nextConfig;
