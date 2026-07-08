/** @type {import('next').NextConfig} */
const nextConfig = {
  // nodemailer uses native Node.js modules (net, tls, dns) that must not be
  // bundled by webpack/turbopack — mark it as external so Next.js leaves it alone.
  serverExternalPackages: ["nodemailer"],
  // 142 pre-existing lint errors repo-wide (mostly no-explicit-any, no-unescaped-entities);
  // re-enable once the backlog is burned down. Type errors DO gate the build now.
  eslint: { ignoreDuringBuilds: true },
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
