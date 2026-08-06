import type { NextConfig } from "next";

// script-src/style-src keep 'unsafe-inline' rather than a nonce setup —
// Next.js's App Router injects inline hydration/RSC payload scripts and
// this repo uses plenty of inline style="" attributes (heatmap.tsx's cqw
// calc, refresh-all-title.tsx's mask-image), and nonce-based CSP needs
// per-request middleware wiring this app doesn't have yet. The other
// directives below still meaningfully narrow the attack surface even
// without a strict script-src: connect-src blocks exfiltrating this
// single-user app's personal data to an attacker's origin, frame-ancestors
// blocks clickjacking, form-action blocks a hijacked <form action> server
// action target, object-src blocks legacy plugin content.
//
// 'unsafe-eval' is added to script-src only outside production — React's
// dev-mode debugging (component stack reconstruction) calls eval(), which
// a strict script-src blocks; React itself never calls eval() in a
// production build, so prod stays without it. Without this split, `next
// dev` (used by both local dev and the e2e suite's webServer) fails with
// a real console error on every page load.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        ],
      },
    ];
  },
};

export default nextConfig;
