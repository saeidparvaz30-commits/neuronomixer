import type { Metadata } from "next";
import DatetimeDataClient from "@/components/VisualGuides/DatetimeData/DatetimeDataClient";

export const metadata: Metadata = {
  title: "Time Is a Dirty Data Type",
  description:
    "Interactive guide to why timestamps go wrong: convert instants across timezones, step through DST's missing and double hours, and watch resampling and gap-filling change the story your data tells.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/datetime-data",
  },
  openGraph: {
    title: "Time Is a Dirty Data Type — NeuroNomixer Visual Guides",
    description:
      "Timezones, DST cliffs, irregular intervals, and gaps: an interactive tour of the most error-prone column in real data, with every number computed live.",
    url: "https://www.neuronomixer.com/visual-guides/datetime-data",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Time Is a Dirty Data Type — NeuroNomixer",
    description:
      "Timezones, DST cliffs, irregular intervals, and gaps: an interactive tour of the most error-prone column in real data, with every number computed live.",
  },
};

export default function DatetimeDataPage() {
  return <DatetimeDataClient />;
}
