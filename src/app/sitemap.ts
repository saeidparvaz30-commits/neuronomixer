import { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";

type PostItem = {
  slug: string;
  categorySlug: string;
  _updatedAt?: string;
  _createdAt?: string;
};

type AuthorItem = {
  slug: string;
  _updatedAt?: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://neuronomixer.com"
  ).replace(/\/$/, "");

  // Fetch dynamic slugs for categories and posts from Sanity
  const data = await client.fetch<{
    posts: PostItem[];
    authors: AuthorItem[];
  }>(
    `{
      "posts": *[
        _type == "post" &&
        defined(slug.current) &&
        defined(category->slug.current) &&
        category->active == true
      ]{
        "slug": slug.current,
        "categorySlug": category->slug.current,
        _updatedAt,
        _createdAt
      },
      "authors": *[_type == "author" && applicationStatus == "approved" && defined(slug.current)]{
        "slug": slug.current,
        _updatedAt
      }
    }`
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      changeFrequency: "weekly",
      priority: 1,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/blog`,
      changeFrequency: "weekly",
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/authors`,
      changeFrequency: "monthly",
      priority: 0.6,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/contact`,
      changeFrequency: "yearly",
      priority: 0.3,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: "yearly",
      priority: 0.2,
      lastModified: new Date(),
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = (data?.posts || []).map((p) => ({
    url: `${baseUrl}/blog/${p.categorySlug}/${p.slug}`,
    lastModified: p._updatedAt
      ? new Date(p._updatedAt)
      : p._createdAt
        ? new Date(p._createdAt)
        : undefined,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const authorRoutes: MetadataRoute.Sitemap = (data?.authors || []).map((a) => ({
    url: `${baseUrl}/authors/${a.slug}`,
    lastModified: a._updatedAt ? new Date(a._updatedAt) : undefined,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...postRoutes, ...authorRoutes];
}
