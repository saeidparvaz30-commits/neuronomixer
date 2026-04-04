import type { Metadata } from "next";
import WhatIsDataClient from "@/components/VisualGuides/WhatIsData/WhatIsDataClient";

export const metadata: Metadata = {
  title: "What Is Data? Types & Structures",
  description:
    "Interactive drag-and-drop explorer teaching structured, unstructured, and semi-structured data types. Learn by sorting real data examples.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/what-is-data" },
  openGraph: {
    title: "What Is Data? Types & Structures — NeuroNomixer Visual Guides",
    description:
      "Learn data types by dragging real examples into category buckets. Interactive, visual, no jargon.",
    url: "https://www.neuronomixer.com/visual-guides/what-is-data",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Is Data? Types & Structures — NeuroNomixer",
    description:
      "Learn data types by dragging real examples into category buckets. Interactive, visual, no jargon.",
  },
};

export default function WhatIsDataPage() {
  return <WhatIsDataClient />;
}
