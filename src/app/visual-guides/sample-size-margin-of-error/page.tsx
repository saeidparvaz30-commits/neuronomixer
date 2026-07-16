import type { Metadata } from "next";
import SampleSizeMarginOfErrorClient from "@/components/VisualGuides/SampleSizeMarginOfError/SampleSizeMarginOfErrorClient";

export const metadata: Metadata = {
  title: "Sample Size, Margin of Error & Survey Design",
  description:
    "Calculate required sample sizes for desired margin of error. Explore cost-precision tradeoffs. Learn how polling organizations plan surveys with weighting and stratification.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/sample-size-margin-of-error",
  },
  openGraph: {
    title: "Sample Size, Margin of Error & Survey Design | NeuroNomixer",
    description:
      "Interactive sample size calculator with real-world survey design principles.",
    url: "https://www.neuronomixer.com/visual-guides/sample-size-margin-of-error",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample Size, Margin of Error & Survey Design",
    description: "Calculate sample sizes and understand polling methodology.",
  },
};

export default function SampleSizeMarginOfErrorPage() {
  return <SampleSizeMarginOfErrorClient />;
}
