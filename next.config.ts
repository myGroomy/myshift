import type { NextConfig } from "next";

// 'unsafe-eval' is only needed by the dev overlay/HMR; production must not allow it.
const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // No external script origins: Tailwind is compiled at build time (postcss), the CDN
      // runtime was both unnecessary and an allowed-script-origin. 'unsafe-eval' stays dev-only.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://images.unsplash.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://cdn.coverr.co",
      "media-src 'self' https://cdn.coverr.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
  turbopack: {
    root: "../",
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
