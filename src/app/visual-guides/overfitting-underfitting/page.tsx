import type { Metadata } from "next";
import OverfittingClient from "@/components/VisualGuides/OverfittingUnderfitting/OverfittingClient";

export const metadata: Metadata = {
  title: "Overfitting vs Underfitting Playground",
  description:
    "Fit polynomials of increasing degree to data and watch the model transition from underfitting to good fit to overfitting. See training and test error diverge in real time.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/overfitting-underfitting" },
  openGraph: {
    title: "Overfitting vs Underfitting Playground | NeuroNomixer",
    description: "Interactive bias-variance playground: tune polynomial degree and see when models memorize noise vs generalize.",
    url: "https://www.neuronomixer.com/visual-guides/overfitting-underfitting",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Overfitting vs Underfitting Playground",
    description: "See overfitting and underfitting happen live as you increase model complexity.",
  },
};

export default function OverfittingPage() {
  return <OverfittingClient />;
}
