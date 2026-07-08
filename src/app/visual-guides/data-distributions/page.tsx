import type { Metadata } from "next";
import DataDistributionsClient from "@/components/VisualGuides/DataDistributions/DataDistributionsClient";

export const metadata: Metadata = {
  title: "Data Distributions: Shape, Spread & Skew",
  description:
    "Explore Normal, Uniform, Exponential, and Poisson distributions interactively. Adjust parameters and watch the histogram reshape in real time. Includes sample simulator and distribution comparison.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/data-distributions" },
  openGraph: {
    title: "Data Distributions: Shape, Spread & Skew — NeuroNomixer Visual Guides",
    description:
      "Interactive histogram playground: pick a distribution, tune parameters, draw random samples, and compare shapes side-by-side.",
    url: "https://www.neuronomixer.com/visual-guides/data-distributions",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Data Distributions: Shape, Spread & Skew — NeuroNomixer",
    description:
      "Normal, Uniform, Exponential, Poisson — visualized with live statistics, parameter sliders, and sample simulation.",
  },
};

export default function DataDistributionsPage() {
  return <DataDistributionsClient />;
}
