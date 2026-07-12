import type { Metadata } from "next";
import SimpsonsParadoxClient from "@/components/VisualGuides/SimpsonsParadox/SimpsonsParadoxClient";

export const metadata: Metadata = {
  title: "Simpson's Paradox & Lurking Variables",
  description:
    "Interactive exploration of Simpson's Paradox: how aggregate trends reverse when disaggregated by lurking variables.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/simpsons-paradox",
  },
  openGraph: {
    title: "Simpson's Paradox & Lurking Variables",
    description:
      "Discover how hidden confounders reverse statistical patterns.",
    type: "article",
  },
};

export default function Page() {
  return <SimpsonsParadoxClient />;
}
