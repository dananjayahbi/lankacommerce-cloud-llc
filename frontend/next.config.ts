import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
