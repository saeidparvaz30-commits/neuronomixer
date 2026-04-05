"use client";

import React from "react";
import { motion } from "framer-motion";
import { MethodType, METHOD_META } from "./data";

const METHODS: MethodType[] = ["pca", "tsne", "umap"];

interface Props {
  method: MethodType;
  onChange: (m: MethodType) => void;
}

export default function MethodSelector({ method, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {METHODS.map(m => {
        const meta = METHOD_META[m];
        const active = m === method;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className="relative px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors border"
            style={{
              borderColor: active ? meta.color : "#1e293b",
              color: active ? meta.color : "#475569",
              background: active ? meta.color + "14" : "transparent",
            }}
          >
            {active && (
              <motion.div
                layoutId="method-indicator"
                className="absolute inset-0 rounded-xl"
                style={{ background: meta.color + "14", border: `1px solid ${meta.color}` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
