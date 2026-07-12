import type { Metadata } from "next";
import ModelCalibrationClient from "@/components/VisualGuides/ModelCalibration/ModelCalibrationClient";

export const metadata: Metadata = {
  title: "Model Calibration",
  description:
    "Break a model's confidence with a miscalibration knob, read the damage off a live reliability diagram and ECE, then repair it with temperature scaling.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/model-calibration",
  },
  openGraph: {
    title: "Model Calibration | NeuroNomixer",
    description:
      "Break a model's confidence with a miscalibration knob, read the damage off a live reliability diagram and ECE, then repair it with temperature scaling.",
    url: "https://www.neuronomixer.com/visual-guides/model-calibration",
    siteName: "NeuroNomixer",
    type: "website",
  },
};

export default function ModelCalibrationPage() {
  return <ModelCalibrationClient />;
}
