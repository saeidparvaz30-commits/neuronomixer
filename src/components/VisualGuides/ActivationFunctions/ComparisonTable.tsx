"use client";

import React from "react";
import type { FunctionId, FunctionProperties } from "./types";

interface ComparisonTableProps {
  properties: Record<FunctionId, FunctionProperties>;
  selectedId: FunctionId;
  onSelect: (id: FunctionId) => void;
}

const MAX_GRADIENT: Record<FunctionId, string> = {
  relu: "1 (for x > 0)",
  sigmoid: "0.25 (at x=0)",
  tanh: "1 (at x=0)",
  "leaky-relu": "1 (for x > 0)",
};

function BoolCell({ value }: { value: boolean }) {
  return (
    <span
      className="font-semibold text-sm"
      style={{ color: value ? "#ef4444" : "#3bb4a4" }}
    >
      {value ? "✗" : "✓"}
    </span>
  );
}

const IDS: FunctionId[] = ["relu", "sigmoid", "tanh", "leaky-relu"];

export default function ComparisonTable({
  properties,
  selectedId,
  onSelect,
}: ComparisonTableProps) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e293b]">
        <h2 className="text-base font-semibold text-white">
          Function Comparison
        </h2>
        <p className="text-xs text-[#64748b] mt-0.5">
          Click a row to explore that function
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e293b]">
              {[
                "Function",
                "Range",
                "Max Gradient",
                "Vanishing Grad?",
                "Dead Neurons?",
                "Best For",
              ].map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[#475569] font-semibold"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {IDS.map((id) => {
              const prop = properties[id];
              const isSelected = id === selectedId;
              return (
                <tr
                  key={id}
                  onClick={() => onSelect(id)}
                  className="border-b border-[#1e293b] last:border-0 cursor-pointer transition-colors hover:bg-[#1e293b]/40"
                  style={
                    isSelected
                      ? { backgroundColor: `${prop.color}0f` }
                      : undefined
                  }
                >
                  {/* Function name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: prop.color }}
                      />
                      <span
                        className="font-semibold"
                        style={{ color: isSelected ? prop.color : "#f8fafc" }}
                      >
                        {prop.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#475569] font-mono mt-0.5 pl-[18px]">
                      {prop.formula}
                    </p>
                  </td>
                  {/* Range */}
                  <td className="px-4 py-3 font-mono text-[#94a3b8]">
                    {prop.range}
                  </td>
                  {/* Max gradient */}
                  <td className="px-4 py-3 text-[#94a3b8]">
                    {MAX_GRADIENT[id]}
                  </td>
                  {/* Vanishing gradient */}
                  <td className="px-4 py-3">
                    <BoolCell value={prop.vanishingRisk} />
                  </td>
                  {/* Dead neurons */}
                  <td className="px-4 py-3">
                    <BoolCell value={prop.deadNeuronRisk} />
                  </td>
                  {/* Best for */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {prop.bestFor.map((use) => (
                        <span
                          key={use}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-[#1e293b] border border-[#334155] text-[#94a3b8] whitespace-nowrap"
                        >
                          {use}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
