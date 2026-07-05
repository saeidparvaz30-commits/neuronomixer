"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScalingMethod } from "./types";

const CONTENT: Record<ScalingMethod, { heading: string; body: string; pros: string[]; cons: string[]; usedBy: string[] }> = {
  meannorm: {
    heading: "Mean Normalization",
    body:    "Subtracts the mean and divides by the feature range (max − min). Unlike min-max, the output is centered at 0 (approx. −0.5 to +0.5). Unlike z-score, scaling is bounded by the data range rather than variance.",
    pros:    ["Centered at 0 like z-score", "Bounded range like min-max", "Intuitive scale"],
    cons:    ["Still sensitive to outliers (uses range)", "Output not always in [−0.5, 0.5]", "Less commonly supported in libraries"],
    usedBy:  ["Gradient Descent", "Neural Networks", "Custom preprocessing pipelines"],
  },
  raw: {
    heading: "Raw (No Scaling)",
    body:    "Features retain their original units — Age in years, Salary in dollars. Distance-based algorithms will be dominated by whichever feature has the largest absolute range.",
    pros:    ["Interpretable values", "No information loss", "Works fine for tree-based models"],
    cons:    ["Distance algorithms skewed by scale", "Gradient descent converges slowly", "Regularization applies unequally"],
    usedBy:  ["Decision Trees", "Random Forests", "Naive Bayes"],
  },
  normalized: {
    heading: "Min-Max Normalization (0–1)",
    body:    "Maps each feature to [0, 1] by subtracting the min and dividing by the range. Easy to interpret but highly sensitive to outliers — one extreme value compresses everything else.",
    pros:    ["Bounded output [0, 1]", "Natural fit for pixel data (0–255)", "Intuitive scale"],
    cons:    ["Sensitive to outliers", "New data can fall outside [0, 1]", "Doesn't center at 0"],
    usedBy:  ["KNN", "Neural Networks", "Image processing"],
  },
  standardized: {
    heading: "Z-Score Standardization",
    body:    "Subtracts the mean and divides by the standard deviation, giving each feature a mean of 0 and standard deviation of 1. Works best on roughly normal data. Outliers still pull the mean and inflate the standard deviation; when they are severe, median/IQR scaling (RobustScaler) is the robust choice.",
    pros:    ["Less outlier-distorted than min-max", "Compatible with PCA/SVD", "Zero mean, unit variance"],
    cons:    ["Not outlier robust (mean and SD shift)", "Unbounded range", "Less intuitive values"],
    usedBy:  ["SVM", "PCA", "Linear/Logistic Regression", "KNN"],
  },
};

const COLOR: Record<ScalingMethod, string> = {
  raw:          "#d4af37",
  normalized:   "#3bb4a4",
  meannorm:     "#a855f7",
  standardized: "#3b82f6",
};

type Props = { method: ScalingMethod };

function MethodExplainerInner({ method }: Props) {
  const c = CONTENT[method];
  const color = COLOR[method];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <AnimatePresence mode="wait">
        <motion.div key={method} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          <p className="text-[11px] font-bold mb-1" style={{ color }}>{c.heading}</p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">{c.body}</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#3bb4a4] mb-1.5">Pros</p>
              <ul className="space-y-1">
                {c.pros.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-[11px] text-[#94a3b8]">
                    <span className="text-[#3bb4a4] mt-0.5 flex-shrink-0">+</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ef4444] mb-1.5">Cons</p>
              <ul className="space-y-1">
                {c.cons.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-[11px] text-[#94a3b8]">
                    <span className="text-[#ef4444] mt-0.5 flex-shrink-0">−</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-1.5">Common algorithms</p>
            <div className="flex flex-wrap gap-1.5">
              {c.usedBy.map((a) => (
                <span key={a} className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                  style={{ color, borderColor: color + "44", background: color + "12" }}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const MethodExplainer = React.memo(MethodExplainerInner);
export default MethodExplainer;
