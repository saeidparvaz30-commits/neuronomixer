import type { Metadata } from "next";
import ModelRoutingCascadesClient from "@/components/VisualGuides/ModelRoutingCascades/ModelRoutingCascadesClient";

export const metadata: Metadata = {
  title: "Model Routing and Cascades | NeuroNomixer",
  description:
    "Route a simulated query stream through a three-tier model cascade, drag the escalation-confidence threshold to trace the cost-quality frontier, then break the router with miscalibrated confidence and watch quality fall while the dashboard stays green.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/model-routing-cascades",
  },
  openGraph: {
    title: "Model Routing and Cascades | NeuroNomixer",
    description:
      "Route a simulated query stream through a three-tier model cascade, drag the escalation-confidence threshold to trace the cost-quality frontier, then break the router with miscalibrated confidence and watch quality fall while the dashboard stays green.",
    url: "https://www.neuronomixer.com/visual-guides/model-routing-cascades",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Model Routing and Cascades | NeuroNomixer",
    description:
      "Route a simulated query stream through a three-tier model cascade, drag the escalation-confidence threshold to trace the cost-quality frontier, then break the router with miscalibrated confidence and watch quality fall while the dashboard stays green.",
  },
};

export default function ModelRoutingCascadesPage() {
  return <ModelRoutingCascadesClient />;
}
