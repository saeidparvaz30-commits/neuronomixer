import type { Metadata } from "next";
import CleaningMessyDataClient from "@/components/VisualGuides/CleaningMessyData/CleaningMessyDataClient";

export const metadata: Metadata = {
  title: "USA, U.S.A., usa: Cleaning Real Values",
  description:
    "Clean a messy survey export yourself: trim whitespace, casefold labels, map synonyms, parse mixed date formats, and coerce text to numbers while unique-value counts and parse rates update live.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/cleaning-messy-data",
  },
  openGraph: {
    title: "USA, U.S.A., usa: Cleaning Real Values | NeuroNomixer",
    description:
      "Trim, casefold, map, parse, coerce: an interactive cleaning pipeline where a 9-spelling country column converges to 3 real countries and every stat is computed live.",
    url: "https://www.neuronomixer.com/visual-guides/cleaning-messy-data",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "USA, U.S.A., usa: Cleaning Real Values | NeuroNomixer",
    description:
      "Trim, casefold, map, parse, coerce: an interactive cleaning pipeline where a 9-spelling country column converges to 3 real countries and every stat is computed live.",
  },
};

export default function CleaningMessyDataPage() {
  return <CleaningMessyDataClient />;
}
