import type { Metadata } from "next";
import RegressionDiagnosticsClient from "@/components/VisualGuides/RegressionDiagnostics/RegressionDiagnosticsClient";

export const metadata: Metadata = {
  title: "Regression Diagnostics: Reading the Residuals",
  description:
    "Check the assumptions behind a linear fit by reading its residual plots, Q-Q plot, and leverage, so you can tell a trustworthy model from a misleading one.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/regression-diagnostics" },
  openGraph: {
    title: "Regression Diagnostics: Reading the Residuals | NeuroNomixer",
    description:
      "Interactive residual, Q-Q, and leverage diagnostics for linear regression. See what a healthy fit looks like and how each assumption fails.",
    url: "https://www.neuronomixer.com/visual-guides/regression-diagnostics",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regression Diagnostics: Reading the Residuals",
    description: "Read residual plots, Q-Q plots, and leverage to judge whether a linear fit can be trusted.",
  },
};

export default function RegressionDiagnosticsPage() {
  return <RegressionDiagnosticsClient />;
}
