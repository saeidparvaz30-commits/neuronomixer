"use client";

import React from "react";
import type { OptimizerConfig, OptimizerType } from "./types";

interface Props {
  configs: OptimizerConfig[];
  onChange: (id: OptimizerType, lr: number) => void;
}

export default function LearningRateSliders({ configs, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {configs.map((cfg) => (
        <div key={cfg.id} className={`transition-opacity ${cfg.enabled ? "opacity-100" : "opacity-40"}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-sm font-medium text-white">{cfg.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {cfg.lr > 0.3 && (
                <span className="text-[10px] text-[var(--color-warning)] font-medium">
                  High LR may diverge
                </span>
              )}
              <span
                className="text-sm font-mono font-bold tabular-nums"
                style={{ color: cfg.color }}
              >
                {cfg.lr.toFixed(3)}
              </span>
            </div>
          </div>
          <input
            type="range"
            min="0.001"
            max="0.5"
            step="0.001"
            value={cfg.lr}
            aria-label={`${cfg.label} learning rate`}
            disabled={!cfg.enabled}
            onChange={(e) => onChange(cfg.id, parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, ${cfg.color} 0%, ${cfg.color} ${(cfg.lr / 0.5) * 100}%, #1e293b ${(cfg.lr / 0.5) * 100}%, #1e293b 100%)`,
              accentColor: cfg.color,
            }}
          />
          <div className="flex justify-between text-[10px] text-[#475569] mt-1">
            <span>0.001</span>
            <span className="text-[#334155]">|</span>
            <span>0.5</span>
          </div>
        </div>
      ))}
    </div>
  );
}
