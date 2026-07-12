import type { Metadata } from "next";
import CategoricalEncodingClient from "@/components/VisualGuides/CategoricalEncoding/CategoricalEncodingClient";

export const metadata: Metadata = {
  title: "Turning Categories into Numbers",
  description:
    "Encode the same 12-row housing table four ways (one-hot, ordinal, frequency, target), explode a one-hot matrix with a cardinality slider, and measure with exact least squares what a fake alphabetical order costs a model.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/categorical-encoding",
  },
  openGraph: {
    title: "Turning Categories into Numbers — NeuroNomixer",
    description:
      "Interactive categorical encoding lab: four live encodings of one dataset, a cardinality explosion slider, and an exact least-squares showdown between ordinal and one-hot.",
    url: "https://www.neuronomixer.com/visual-guides/categorical-encoding",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Turning Categories into Numbers — NeuroNomixer",
    description:
      "One-hot, ordinal, frequency, and target encoding on live data, plus a leakage preview where target encoding memorizes noise.",
  },
};

export default function CategoricalEncodingPage() {
  return <CategoricalEncodingClient />;
}
