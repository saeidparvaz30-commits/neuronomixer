import type { Metadata } from "next";
import RNNsLSTMsClient from "@/components/VisualGuides/RNNsLSTMs/RNNsLSTMsClient";

export const metadata: Metadata = {
  title: "RNNs & LSTMs: Memory in Networks",
  description:
    "Watch information flow through recurrent cells step by step. See how LSTMs solve the vanishing gradient problem with gates and cell state.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/rnns-lstms" },
  openGraph: {
    title: "RNNs & LSTMs: Memory in Networks — NeuroNomixer",
    description:
      "Watch information flow through recurrent cells step by step. See how LSTMs solve the vanishing gradient problem with gates and cell state.",
    url: "https://www.neuronomixer.com/visual-guides/rnns-lstms",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "RNNs & LSTMs: Memory in Networks",
    description:
      "Watch information flow through recurrent cells step by step. See how LSTMs solve the vanishing gradient problem with gates and cell state.",
  },
};

export default function RNNsLSTMsPage() {
  return <RNNsLSTMsClient />;
}
