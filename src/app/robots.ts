import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.neuronomixer.com";

  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  return {
    rules: isProd
      ? [
          {
            userAgent: "*",
            // Crawlers must be able to fetch /api/share/* so the X-Robots-Tag
            // noindex on those responses is readable; longest-match Allow
            // beats the /api/ Disallow.
            allow: ["/", "/api/share/"],
            disallow: [
              "/api/",
              "/studio/",
              "/dashboard/",
              "/review",
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
