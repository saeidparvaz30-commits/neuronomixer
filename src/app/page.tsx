import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import HomePageClient from "@/components/HomePage/HomePageClient";

export const metadata: Metadata = {
  title: "NeuroNomixer — AI, Data & Risk Analytics",
  description:
    "NeuroNomixer explores the intersection of AI, data science, and risk analytics through in-depth articles and insights.",
  openGraph: {
    title: "NeuroNomixer — AI, Data & Risk Analytics",
    description: "Exploring the intersection of AI, data science, and risk analytics.",
    url: "https://www.neuronomixer.com",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroNomixer — AI, Data & Risk Analytics",
    description: "Exploring the intersection of AI, data science, and risk analytics.",
  },
};

const query = `{
  "posts": *[_type == "post" && status != "rejected" && status != "hidden" && status != "deletion_requested"] | order(featured desc, publishedAt desc) [0...9] {
    _id, title, slug, description, publishedAt, featured, heroOrder,
    "mainImage": mainImage.asset->url,
    "category": category->{ _id, title, slug },
    "author": author->{ _id, name, slug, "image": image.asset->url, jobTitle }
  },
  "categories": *[_type == "category" && active == true] | order(order asc) [0...3] {
    _id, title, slug, description,
    "image": image.asset->url
  }
}`;

export const revalidate = 60;

const siteUrl = "https://www.neuronomixer.com";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "NeuroNomixer",
    url: siteUrl,
    logo: { "@type": "ImageObject", url: `${siteUrl}/pictures/Logo.png` },
    sameAs: [
      "https://www.linkedin.com/company/neuronomixer",
      "https://x.com/neuronomixer",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: siteUrl,
    name: "NeuroNomixer",
    description: "Exploring the intersection of AI, data science, and risk analytics.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/blog?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  },
];

export default async function Home() {
  const data = await client.fetch(query);
  return (
    <main className="min-h-screen">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <HomePageClient posts={data.posts ?? []} categories={data.categories ?? []} />
    </main>
  );
}
