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

interface SliderProps {
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: string;
  onChange: (v: number) => void;
}

function Slider({ label, symbol, value, min, max, step, color, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#94a3b8]">
          {label}{" "}
          <span className="font-semibold" style={{ color }}>{symbol}</span>
        </span>
        <span className="text-[12px] font-black font-mono" style={{ color }}>
          {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
        </span>
      </div>

      {/* Custom slider track */}
      <div className="relative h-6 flex items-center">
        {/* Track — full width, dark */}
        <div className="absolute inset-x-0 h-[5px] rounded-full bg-[#1e293b]" />
        {/* Filled portion — from left to thumb */}
        <div
          className="absolute h-[5px] rounded-full left-0"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.65 }}
        />
        {/* Native range input — invisible overlay for interaction */}
        <input
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full cursor-pointer opacity-0 h-6 z-10"
          style={{ margin: 0 }}
        />
        {/* Visual thumb */}
        <div
          className="absolute w-[18px] h-[18px] rounded-full pointer-events-none -translate-x-1/2 z-20"
          style={{
            left: `${pct}%`,
            backgroundColor: color,
            border: "2.5px solid #0f172a",
            boxShadow: `0 0 0 3px ${color}50, 0 2px 6px rgba(0,0,0,0.6)`,
          }}
        />
      </div>

      <div className="flex justify-between">
        <span className="text-[9px] text-[#334155]">{min}</span>
        <span className="text-[9px] text-[#334155]">{max}</span>
      </div>
    </div>
  );
}

interface Props {
  dist: DistributionType;
  color: string;
  normalParams: NormalParams;
  uniformParams: UniformParams;
  exponentialParams: ExponentialParams;
  poissonParams: PoissonParams;
  onNormal: (p: NormalParams) => void;
  onUniform: (p: UniformParams) => void;
  onExponential: (p: ExponentialParams) => void;
  onPoisson: (p: PoissonParams) => void;
}

export default function ParameterSliders({
  dist, color,
  normalParams, uniformParams, exponentialParams, poissonParams,
  onNormal, onUniform, onExponential, onPoisson,
}: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={dist}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="space-y-5"
      >
        {dist === "normal" && (
          <>
            <Slider
              label="Mean" symbol={`μ = ${normalParams.mu}`}
              value={normalParams.mu} min={0} max={100} step={1} color={color}
              onChange={v => onNormal({ ...normalParams, mu: v })}
            />
            <Slider
              label="Std Dev" symbol={`σ = ${normalParams.sigma}`}
              value={normalParams.sigma} min={0.5} max={30} step={0.5} color={color}
              onChange={v => onNormal({ ...normalParams, sigma: v })}
            />
            <p className="text-[10px] text-[#475569] font-mono">
              N(μ={normalParams.mu}, σ²={(normalParams.sigma ** 2).toFixed(1)})
            </p>
          </>
        )}

        {dist === "uniform" && (
          <>
            <Slider
              label="Lower bound" symbol={`a = ${uniformParams.a}`}
              value={uniformParams.a} min={0} max={40} step={1} color={color}
              onChange={v => onUniform({ ...uniformParams, a: Math.min(v, uniformParams.b - 1) })}
            />
            <Slider
              label="Upper bound" symbol={`b = ${uniformParams.b}`}
              value={uniformParams.b} min={60} max={100} step={1} color={color}
              onChange={v => onUniform({ ...uniformParams, b: Math.max(v, uniformParams.a + 1) })}
            />
            <p className="text-[10px] text-[#475569] font-mono">
              U({uniformParams.a}, {uniformParams.b}) — enforces a &lt; b
            </p>
          </>
        )}

        {dist === "exponential" && (
          <>
            <Slider
              label="Rate" symbol={`λ = ${exponentialParams.lambda.toFixed(1)}`}
              value={exponentialParams.lambda} min={0.1} max={2} step={0.1} color={color}
              onChange={v => onExponential({ lambda: v })}
            />
            <p className="text-[10px] text-[#475569] font-mono">
              Exp(λ={exponentialParams.lambda.toFixed(2)}) — mean = {(1 / exponentialParams.lambda).toFixed(2)}
            </p>
            <p className="text-[9px] text-[#334155]">λ = 1/mean (higher λ → shorter mean)</p>
          </>
        )}

        {dist === "poisson" && (
          <>
            <Slider
              label="Rate" symbol={`λ = ${poissonParams.lambda.toFixed(1)}`}
              value={poissonParams.lambda} min={0.5} max={15} step={0.5} color={color}
              onChange={v => onPoisson({ lambda: v })}
            />
            <p className="text-[10px] text-[#475569] font-mono">
              Poisson(λ={poissonParams.lambda.toFixed(1)}) — discrete counts
            </p>
            <p className="text-[9px] text-[#334155]">λ = expected events per interval</p>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
