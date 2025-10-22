import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://neuronomixer.com";

  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  return {
    rules: isProd
      ? [
          {
            userAgent: "*",
            allow: "/",
            disallow: [
              "/api/",
              "/studio/",
              "/drafts/",
              "/inactive/",
              "/hidden/",
              "/private/",
            ],
          },
        ]
      : [
          {
            userAgent: "*",
            disallow: "/", // block crawlers on preview or local
          },
        ],
    sitemap: isProd ? `${baseUrl}/sitemap.xml` : undefined,
  };
}
