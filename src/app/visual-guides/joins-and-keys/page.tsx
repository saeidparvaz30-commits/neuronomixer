import type { Metadata } from "next";
import JoinsKeysClient from "@/components/VisualGuides/JoinsKeys/JoinsKeysClient";

export const metadata: Metadata = {
  title: "Joins: How Tables Find Each Other | NeuroNomixer",
  description:
    "Run inner, left, right, and full outer joins on two live tables, watch NULL fill in for unmatched rows, then break a primary key and see the row count multiply.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/joins-and-keys",
  },
  openGraph: {
    title: "Joins: How Tables Find Each Other | NeuroNomixer",
    description:
      "Run inner, left, right, and full outer joins on two live tables, watch NULL fill in for unmatched rows, then break a primary key and see the row count multiply.",
    url: "https://www.neuronomixer.com/visual-guides/joins-and-keys",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Joins: How Tables Find Each Other | NeuroNomixer",
    description:
      "Run inner, left, right, and full outer joins on two live tables, watch NULL fill in for unmatched rows, then break a primary key and see the row count multiply.",
  },
};

export default function JoinsAndKeysPage() {
  return <JoinsKeysClient />;
}
