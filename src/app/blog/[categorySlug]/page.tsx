import { client } from "@/sanity/lib/client";
import CategoryViewClient from "@/components/Category/CategoryViewClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const query = `
*[_type=="category" && slug.current == $slug][0]{
  _id,
  title,
  slug,
  description,
  intuitive,
  image{ asset->{ url } },
  "posts": *[_type=="post" && references(^._id)] | order(order asc){
    _id, title, slug, description
  }, 
  active
}`;

export async function generateStaticParams() {
  const categories = await client.fetch<{ slug: string }[]>(
    `*[_type == "category" && active == true && defined(slug.current)]{ "slug": slug.current }`
  );
  return categories.map((c) => ({ categorySlug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug: slug } = await params;
  const category = await client.fetch(
    `*[_type=="category" && slug.current == $slug][0]{ title, description, "imageUrl": image.asset->url }`,
    { slug }
  );
  if (!category) return {};

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com").replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/blog/${slug}`;
  const title = `${category.title} — NeuroNomixer`;
  const description = category.description ?? `Articles about ${category.title} on NeuroNomixer.`;
  const ogImage = category.imageUrl
    ? [{ url: category.imageUrl, alt: category.title }]
    : [{ url: `${siteUrl}/pictures/Logo.png`, alt: "NeuroNomixer" }];

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "NeuroNomixer",
      type: "website",
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage.map((i) => i.url),
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug: slug } = await params;
  if (!slug) notFound();

  const category = await client.fetch(query, { slug });

  // 404 if not found OR inactive
  if (!category || category.active === false) {
    notFound();
  }

  return <CategoryViewClient category={category} />;
}
