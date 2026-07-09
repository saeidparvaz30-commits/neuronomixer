import type { Metadata } from "next";
import BenchmarkLiteracyClient from "@/components/VisualGuides/BenchmarkLiteracy/BenchmarkLiteracyClient";

export const metadata: Metadata = {
  title: "Reading Benchmarks Critically | NeuroNomixer",
  description:
    "Leak test items into a simulated model's training set and watch its leaderboard score inflate while a private held-out set stays put, then catch a rank flip, a saturated benchmark, and best-of-N selection.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/benchmark-literacy",
  },
  openGraph: {
    title: "Reading Benchmarks Critically | NeuroNomixer",
    description:
      "Leak test items into a simulated model's training set and watch its leaderboard score inflate while a private held-out set stays put, then catch a rank flip, a saturated benchmark, and best-of-N selection.",
    url: "https://www.neuronomixer.com/visual-guides/benchmark-literacy",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reading Benchmarks Critically | NeuroNomixer",
    description:
      "Leak test items into a simulated model's training set and watch its leaderboard score inflate while a private held-out set stays put, then catch a rank flip, a saturated benchmark, and best-of-N selection.",
  },
};

export default function BenchmarkLiteracyPage() {
  return <BenchmarkLiteracyClient />;
}
