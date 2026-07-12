import type { Metadata } from "next";
import CostLatencyClient from "@/components/VisualGuides/CostLatency/CostLatencyClient";

export const metadata: Metadata = {
  title: "Cost and Latency Engineering",
  description:
    "Price a real LLM workload with live token math, split response time into TTFT and per-token generation, race streaming against blocking output, and compute exactly when prompt caching pays for itself.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/cost-latency-engineering",
  },
  openGraph: {
    title: "Cost and Latency Engineering | NeuroNomixer",
    description:
      "Price a real LLM workload with live token math, split response time into TTFT and per-token generation, race streaming against blocking output, and compute exactly when prompt caching pays for itself.",
    url: "https://www.neuronomixer.com/visual-guides/cost-latency-engineering",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cost and Latency Engineering | NeuroNomixer",
    description:
      "Price a real LLM workload with live token math, split response time into TTFT and per-token generation, race streaming against blocking output, and compute exactly when prompt caching pays for itself.",
  },
};

export default function CostLatencyEngineeringPage() {
  return <CostLatencyClient />;
}
