import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { homePageQuery } from "@/sanity/lib/queries";
import HomePageClient from "@/components/HomePage/HomePageClient";

export const metadata: Metadata = {
  title: { absolute: "NeuroNomixer | AI, Data & Risk Analytics" },
  description:
    "NeuroNomixer explores the intersection of AI, data science, and risk analytics through in-depth articles and insights.",
  alternates: { canonical: "https://www.neuronomixer.com" },
  openGraph: {
    title: "NeuroNomixer | AI, Data & Risk Analytics",
    description: "Exploring the intersection of AI, data science, and risk analytics.",
    url: "https://www.neuronomixer.com",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroNomixer | AI, Data & Risk Analytics",
    description: "Exploring the intersection of AI, data science, and risk analytics.",
  },
};

export const revalidate = 30;

const siteUrl = "https://www.neuronomixer.com";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "NeuroNomixer",
    url: siteUrl,
    logo: { "@type": "ImageObject", url: `${siteUrl}/og/logo-512.png` },
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
  const data = await client.fetch(homePageQuery);
  return (
    <main className="min-h-screen">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <HomePageClient
        heroPosts={data.heroPosts ?? []}
        latestPosts={data.latestPosts ?? []}
        categories={data.categories ?? []}
      />
    </main>
  );
}
