import type { Metadata } from "next";
import PromptInjectionClient from "@/components/VisualGuides/PromptInjection/PromptInjectionClient";

export const metadata: Metadata = {
  title: "Prompt Injection",
  description:
    "Understand the prompt injection threat model for AI agents: direct vs indirect attacks, a simulated email-assistant scenario, and the defense-in-depth playbook for builders.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/prompt-injection",
  },
  openGraph: {
    title: "Prompt Injection | NeuroNomixer",
    description:
      "Understand the prompt injection threat model for AI agents: direct vs indirect attacks, a simulated email-assistant scenario, and the defense-in-depth playbook for builders.",
    url: "https://www.neuronomixer.com/visual-guides/prompt-injection",
    siteName: "NeuroNomixer",
    type: "website",
  },
};

export default function PromptInjectionPage() {
  return <PromptInjectionClient />;
}
