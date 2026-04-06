/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/blog/data-learning-path/data-the-red-cells-of-our-digital-world-veins",
        destination: "/blog/data-learning-path/data-the-red-cells-of-our-digital-worlds-veins",
        permanent: true,
      },
    ];
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: {
    // ✅ Don't block production builds on type errors
    ignoreBuildErrors: true,
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
