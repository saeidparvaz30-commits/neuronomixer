/** @type {import('next').NextConfig} */
const nextConfig = {
  // nodemailer uses native Node.js modules (net, tls, dns) that must not be
  // bundled by webpack/turbopack — mark it as external so Next.js leaves it alone.
  serverExternalPackages: ["nodemailer"],
  // Once the only root layout lives inside the (en) route group, a grouped
  // not-found.tsx no longer serves URLs that match no group, so unmatched URLs
  // fall back to Next's unbranded default. global-not-found.tsx is the
  // documented fix and requires this flag (OQ-1 contingency, approved 2026-08-16).
  experimental: { globalNotFound: true },
  eslint: { ignoreDuringBuilds: false },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
