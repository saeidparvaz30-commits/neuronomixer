/** @type {import('next').NextConfig} */
const nextConfig = {
  // nodemailer uses native Node.js modules (net, tls, dns) that must not be
  // bundled by webpack/turbopack — mark it as external so Next.js leaves it alone.
  serverExternalPackages: ["nodemailer"],
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
