import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `jose` ships ESM-only (no CJS build). Next.js's bundler handles that
  // fine either way, but this also drives `next/jest`'s transformIgnorePatterns
  // so Jest can transform it too instead of choking on a raw `export` statement.
  transpilePackages: ["jose"],
};

export default nextConfig;
