import type { Metadata } from "next";
import ChiSquareGuideClient from "@/components/VisualGuides/ChiSquareGuide/ChiSquareGuideClient";

export const metadata: Metadata = {
  title: "Chi-Square Test of Independence | NeuroNomixer",
  description:
    "Interactive guide to chi-square test of independence, contingency tables, expected frequencies, and association measures.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/chi-square-independence",
  },
  openGraph: {
    title: "Chi-Square Test of Independence",
    description:
      "Learn chi-square testing through interactive contingency tables.",
    type: "article",
  },
};

export default function Page() {
  return <ChiSquareGuideClient />;
}
