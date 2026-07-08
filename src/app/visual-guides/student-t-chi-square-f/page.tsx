import type { Metadata } from "next";
import StudentTChiSquareFClient from "@/components/VisualGuides/StudentTChiSquareF/StudentTChiSquareFClient";

export const metadata: Metadata = {
  title: "Student's t, Chi-Square & F Distributions",
  description:
    "Compare the t, chi-square, and F distributions. Understand why small samples need heavier tails. Learn when to use each distribution in real analyses.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/student-t-chi-square-f",
  },
  openGraph: {
    title:
      "Student's t, Chi-Square & F Distributions — NeuroNomixer Visual Guides",
    description:
      "Interactive comparison of three key sampling distributions.",
    url: "https://www.neuronomixer.com/visual-guides/student-t-chi-square-f",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Student's t, Chi-Square & F Distributions",
    description:
      "See why t-distributions have heavier tails and when to apply them.",
  },
};

export default function StudentTChiSquareFPage() {
  return <StudentTChiSquareFClient />;
}
