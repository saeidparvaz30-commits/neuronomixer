import type { Metadata } from "next";
import WhatIsMLClient from "@/components/VisualGuides/WhatIsML/WhatIsMLClient";

export const metadata: Metadata = {
  title: "What Is Machine Learning? The Big Picture",
  description:
    "Compare rule-based programming vs machine learning side by side across three real scenarios: spam detection, image recognition, and house price prediction.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/what-is-ml" },
  openGraph: {
    title: "What Is Machine Learning? The Big Picture | NeuroNomixer",
    description:
      "Animated side-by-side comparison of rule-based programming vs ML. Explore supervised, unsupervised, and reinforcement learning.",
    url: "https://www.neuronomixer.com/visual-guides/what-is-ml",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Is Machine Learning? The Big Picture",
    description: "Rules vs ML: see the difference through spam detection, image recognition, and price prediction.",
  },
};

export default function WhatIsMLPage() {
  return <WhatIsMLClient />;
}
