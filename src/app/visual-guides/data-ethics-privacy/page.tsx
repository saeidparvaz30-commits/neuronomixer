import type { Metadata } from "next";
import DataEthicsPrivacyClient from "@/components/VisualGuides/DataEthicsPrivacy/DataEthicsPrivacyClient";

export const metadata: Metadata = {
  title: "Anonymous Is Harder Than You Think",
  description:
    "Removing names is not anonymization: run a real linkage attack on a synthetic release, defend it with live-computed k-anonymity, and trace the privacy-utility tradeoff yourself.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/data-ethics-privacy",
  },
  openGraph: {
    title: "Anonymous Is Harder Than You Think | NeuroNomixer",
    description:
      "Linkage attacks, k-anonymity, and the privacy-utility tradeoff: play attacker, then data steward, on two fully visible synthetic tables.",
    url: "https://www.neuronomixer.com/visual-guides/data-ethics-privacy",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anonymous Is Harder Than You Think | NeuroNomixer",
    description:
      "Linkage attacks, k-anonymity, and the privacy-utility tradeoff: play attacker, then data steward, on two fully visible synthetic tables.",
  },
};

export default function DataEthicsPrivacyPage() {
  return <DataEthicsPrivacyClient />;
}
