import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  const nextConfig: NextConfig = {
    // Self-contained server in .next/standalone, used by the Docker image
    output: "standalone",
    cacheComponents: true,
    partialPrefetching: true,
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };

  // In AWS the load balancer sends /api/* to the backend. Locally there is no
  // load balancer, so `next dev` proxies /api/* to the backend instead.
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";
    nextConfig.rewrites = async () => [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
    ];
  }

  return nextConfig;
}
