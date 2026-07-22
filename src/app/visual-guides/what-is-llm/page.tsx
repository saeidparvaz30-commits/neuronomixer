import type { Metadata } from "next";
import WhatIsLLMClient from "@/components/VisualGuides/WhatIsLLM/WhatIsLLMClient";

export const metadata: Metadata = {
  title: "What Is a Large Language Model?",
  description:
    "Animated journey from text input through billions of parameters to next-token prediction. Understand how LLMs are trained and why scale matters.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/what-is-llm" },
  openGraph: {
    title: "What Is a Large Language Model? | NeuroNomixer",
    description:
      "Animated journey from text input through billions of parameters to next-token prediction. Understand how LLMs are trained and why scale matters.",
    url: "https://www.neuronomixer.com/visual-guides/what-is-llm",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Is a Large Language Model?",
    description:
      "Animated journey from text input through billions of parameters to next-token prediction. Understand how LLMs are trained and why scale matters.",
  },
};

export default function WhatIsLLMPage() {
  return <WhatIsLLMClient />;
}
