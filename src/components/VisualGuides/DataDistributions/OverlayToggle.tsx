"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DistributionType,
  NormalParams,
  UniformParams,
  ExponentialParams,
  PoissonParams,
} from "./types";
import DistributionSelector from "./DistributionSelector";
import ParameterSliders from "./ParameterSliders";

interface Props {
  showOverlay: boolean;
  overlayDistribution: DistributionType;
  overlayNormalParams: NormalParams;
  overlayUniformParams: UniformParams;
  overlayExponentialParams: ExponentialParams;
  overlayPoissonParams: PoissonParams;
  onToggle: (v: boolean) => void;
  onOverlayDistChange: (d: DistributionType) => void;
  onOverlayNormal: (p: NormalParams) => void;
  onOverlayUniform: (p: UniformParams) => void;
  onOverlayExponential: (p: ExponentialParams) => void;
  onOverlayPoisson: (p: PoissonParams) => void;
  overlayColor: string;
}

export default function OverlayToggle({
  showOverlay, overlayDistribution,
  overlayNormalParams, overlayUniformParams, overlayExponentialParams, overlayPoissonParams,
  onToggle, onOverlayDistChange,
  onOverlayNormal, onOverlayUniform, onOverlayExponential, onOverlayPoisson,
  overlayColor,
}: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showOverlay}
          onChange={e => onToggle(e.target.checked)}
          className="w-4 h-4 rounded"
          style={{ accentColor: "#d4af37" }}
        />
        <span className="text-[12px] font-semibold text-[#f1f5f9]">
          Compare with another distribution
        </span>
      </label>

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              <DistributionSelector
                current={overlayDistribution}
                onChange={onOverlayDistChange}
                label="Compare distribution"
              />
              <div
                className="rounded-xl border p-4 space-y-3"
                style={{ borderColor: overlayColor + "40", background: overlayColor + "08" }}
              >
                <ParameterSliders
                  dist={overlayDistribution}
                  color={overlayColor}
                  normalParams={overlayNormalParams}
                  uniformParams={overlayUniformParams}
                  exponentialParams={overlayExponentialParams}
                  poissonParams={overlayPoissonParams}
                  onNormal={onOverlayNormal}
                  onUniform={onOverlayUniform}
                  onExponential={onOverlayExponential}
                  onPoisson={onOverlayPoisson}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
