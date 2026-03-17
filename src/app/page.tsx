import type { Metadata } from "next";
import Hero from "@/components/HomePage/Hero";

export const metadata: Metadata = {
  title: "NeuroNomixer — AI, Data & Risk Analytics",
  description:
    "NeuroNomixer explores the intersection of AI, data science, and risk analytics through in-depth articles and insights.",
  openGraph: {
    title: "NeuroNomixer — AI, Data & Risk Analytics",
    description:
      "Exploring the intersection of AI, data science, and risk analytics.",
    url: "https://www.neuronomixer.com",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroNomixer — AI, Data & Risk Analytics",
    description:
      "Exploring the intersection of AI, data science, and risk analytics.",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
    </main>
  );
}
