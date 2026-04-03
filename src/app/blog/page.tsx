import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { prisma } from "@/lib/prisma";
import BlogClient from "@/components/Blog/BlogClient";

export const metadata: Metadata = {
  title: "Blog — NeuroNomixer",
  description:
    "Explore in-depth articles on AI, machine learning, data science, and risk analytics from the NeuroNomixer team.",
  alternates: { canonical: "https://www.neuronomixer.com/blog" },
  openGraph: {
    title: "Blog — NeuroNomixer",
    description:
      "Explore in-depth articles on AI, machine learning, data science, and risk analytics.",
    url: "https://www.neuronomixer.com/blog",
    siteName: "NeuroNomixer",
    type: "website",
    images: [{ url: "https://www.neuronomixer.com/pictures/Logo.png", alt: "NeuroNomixer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — NeuroNomixer",
    description:
      "Explore in-depth articles on AI, machine learning, data science, and risk analytics.",
  },
};

const query = `{
  "categories": *[_type == "category" && active == true] | order(order asc) {
    _id, title, slug, description, intuitive
  },
  "posts": *[_type == "post" && (status == "approved" || !defined(status) || (status == "scheduled" && publishedAt <= now()))] | order(featured desc, publishedAt desc) {
    _id, title, slug, description, publishedAt, featured,
    "bodyExcerpt": pt::text(body)[0...300],
    "mainImage": mainImage.asset->url,
    "category": category->{ _id, title, slug },
    "author": author->{ _id, name, slug, "image": image.asset->url, jobTitle }
  },
  "authors": *[_type == "author" && applicationStatus == "approved"] | order(order asc) [0...6] {
    _id, name, slug, "image": image.asset->url, jobTitle
  }
}`;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [data, viewCounts] = await Promise.all([
    client.fetch(query),
    prisma.postView.groupBy({
      by: ["postSlug"],
      where: { viewedAt: { gte: oneWeekAgo } },
      _count: { postSlug: true },
      orderBy: { _count: { postSlug: "desc" } },
      take: 4,
    }),
  ]);

  // Ordered list of trending slugs (most viewed first this week)
  const trendingSlugOrder = viewCounts.map((v) => v.postSlug);

  return (
    <BlogClient
      key={cat ?? "_all"}
      categories={data.categories ?? []}
      posts={data.posts ?? []}
      authors={data.authors ?? []}
      trendingSlugOrder={trendingSlugOrder}
      initialCat={cat ?? null}
    />
  );
}
