import type { Metadata } from "next";
import LLMMonitoringDriftClient from "@/components/VisualGuides/LLMMonitoringDrift/LLMMonitoringDriftClient";

export const metadata: Metadata = {
  title: "Monitoring and Drift for LLM Apps | NeuroNomixer",
  description:
    "Inject a regression into simulated LLM production traffic, tune a CUSUM changepoint detector to catch it, and measure the honest tradeoff between detection delay and false alarms.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/llm-monitoring-drift",
  },
  openGraph: {
    title: "Monitoring and Drift for LLM Apps | NeuroNomixer",
    description:
      "Inject a regression into simulated LLM production traffic, tune a CUSUM changepoint detector to catch it, and measure the honest tradeoff between detection delay and false alarms.",
    url: "https://www.neuronomixer.com/visual-guides/llm-monitoring-drift",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Monitoring and Drift for LLM Apps | NeuroNomixer",
    description:
      "Inject a regression into simulated LLM production traffic, tune a CUSUM changepoint detector to catch it, and measure the honest tradeoff between detection delay and false alarms.",
  },
};

export default function LLMMonitoringDriftPage() {
  return <LLMMonitoringDriftClient />;
}
