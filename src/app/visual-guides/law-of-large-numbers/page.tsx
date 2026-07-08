import type { Metadata } from "next";
import LawOfLargeNumbersClient from "@/components/VisualGuides/LawOfLargeNumbers/LawOfLargeNumbersClient";

export const metadata: Metadata = {
  title: "The Law of Large Numbers | NeuroNomixer",
  description:
    "Draw real seeded samples and watch the running mean converge to the population mean, then meet the Cauchy distribution where it never does. Interactive simulation.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/law-of-large-numbers",
  },
  openGraph: {
    title: "The Law of Large Numbers | NeuroNomixer Visual Guides",
    description:
      "Interactive running-mean simulator across four distributions, including the heavy-tailed Cauchy where the law breaks down.",
    url: "https://www.neuronomixer.com/visual-guides/law-of-large-numbers",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Law of Large Numbers",
    description:
      "Watch running means converge, and see the gambler's fallacy debunked with real simulated flips.",
  },
};

export default function LawOfLargeNumbersPage() {
  return <LawOfLargeNumbersClient />;
}
