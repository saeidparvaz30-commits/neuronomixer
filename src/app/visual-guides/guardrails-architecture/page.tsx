import type { Metadata } from "next";
import GuardrailsArchitectureClient from "@/components/VisualGuides/GuardrailsArchitecture/GuardrailsArchitectureClient";

export const metadata: Metadata = {
  title: "Guardrails Architecture | NeuroNomixer",
  description:
    "Toggle four defense layers over a fixed corpus of attack and benign strings, run them through transparent rule-based classifiers, and watch the block rate trade off against the false-positive rate. See why single layers fail and stacks hold.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/guardrails-architecture",
  },
  openGraph: {
    title: "Guardrails Architecture | NeuroNomixer",
    description:
      "Toggle four defense layers over a fixed corpus of attack and benign strings, run them through transparent rule-based classifiers, and watch the block rate trade off against the false-positive rate. See why single layers fail and stacks hold.",
    url: "https://www.neuronomixer.com/visual-guides/guardrails-architecture",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guardrails Architecture | NeuroNomixer",
    description:
      "Toggle four defense layers over a fixed corpus of attack and benign strings, run them through transparent rule-based classifiers, and watch the block rate trade off against the false-positive rate.",
  },
};

export default function GuardrailsArchitecturePage() {
  return <GuardrailsArchitectureClient />;
}
