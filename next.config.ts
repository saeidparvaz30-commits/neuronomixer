/** @type {import(‘next’).NextConfig} */
const nextConfig = {
  experimental: { turbo: false },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
