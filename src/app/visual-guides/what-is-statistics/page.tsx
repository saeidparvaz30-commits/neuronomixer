import type { Metadata } from "next";
import WhatIsStatisticsClient from "@/components/VisualGuides/WhatIsStatistics/WhatIsStatisticsClient";

export const metadata: Metadata = {
  title: "What Is Statistics? Why It Matters",
  description:
    "Explore three real-world scenarios with raw data and discover why intuition alone fails. Learn descriptive, inferential, and predictive statistics through interactive decision-making.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/what-is-statistics" },
  openGraph: {
    title: "What Is Statistics? — NeuroNomixer Visual Guides",
    description: "Interactive visual essay on why organizations use statistics. Three mini-scenarios with real data.",
    url: "https://www.neuronomixer.com/visual-guides/what-is-statistics",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Is Statistics? — NeuroNomixer Visual Guides",
    description: "Discover how statistics reveals hidden patterns in real data.",
  },
};

export default function WhatIsStatisticsPage() {
  return <WhatIsStatisticsClient />;
}
