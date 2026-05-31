import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly set the workspace root to the frontend directory.
    // Without this, Turbopack traverses up to the monorepo root and watches
    // the entire repo (including backend/.venv), causing excessive RAM usage.
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      // Django media files (local dev and production)
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "*.lankacommerce.com",
        pathname: "/media/**",
      },
      // Allow any http/https source for tenant-uploaded images
      // (tenant images may be hosted on CDNs or external URLs)
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

// Wrap with Sentry only when the SDK is available (it's an optional dep in dev)
let exportedConfig: NextConfig = nextConfig;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withSentryConfig } = require("@sentry/nextjs");
  exportedConfig = withSentryConfig(nextConfig, {
    silent: true,
    hideSourceMaps: true,
    disableLogger: true,
  });
} catch {
  // @sentry/nextjs not installed — skip wrapping
}

export default exportedConfig;
