import type { Metadata } from "next";
import CountModelsPoissonClient from "@/components/VisualGuides/CountModelsPoisson/CountModelsPoissonClient";

export const metadata: Metadata = {
  title: "Count Models: Poisson & Negative Binomial | NeuroNomixer",
  description:
    "Master generalized linear models for count data. Explore Poisson regression, overdispersion, negative binomial models, and the GLM framework.",
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/count-models-poisson",
  },
  openGraph: {
    title: "Count Models: Poisson & Negative Binomial",
    description:
      "Learn when linear regression fails for counts and how GLMs fix it.",
    type: "article",
  },
};

export default function Page() {
  return <CountModelsPoissonClient />;
}
