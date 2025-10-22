import { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";

type CategoryItem = {
  slug: string;
  _updatedAt?: string;
};

type PostItem = {
  slug: string;
  categorySlug: string;
  _updatedAt?: string;
  _createdAt?: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  // Fetch dynamic slugs for categories and posts from Sanity
  const data = await client.fetch<{
    categories: CategoryItem[];
    posts: PostItem[];
  }>(
    `{
      "categories": *[_type == "category" && defined(slug.current) && active == true]{
        "slug": slug.current,
        _updatedAt
      },
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

  const categoryRoutes: MetadataRoute.Sitemap = (data?.categories || []).map(
    (c) => ({
      url: `${baseUrl}/blog/${c.slug}`,
      lastModified: c._updatedAt ? new Date(c._updatedAt) : undefined,
      changeFrequency: "weekly",
      priority: 0.6,
    })
  );

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

  return [...staticRoutes, ...categoryRoutes, ...postRoutes];
}
