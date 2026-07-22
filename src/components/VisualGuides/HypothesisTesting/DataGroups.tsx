"use client";

import React, { useMemo } from "react";

interface DataGroupsProps {
  effectSize: number;
  sampleSize: number;
  groupA: number[] | null;
  groupB: number[] | null;
  showGroups: boolean;
}

// Deterministic seeded pseudo-random using LCG
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function calcMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export default function DataGroups({
  effectSize,
  sampleSize,
  groupA,
  groupB,
  showGroups,
}: DataGroupsProps) {
  // Generate 30 deterministic preview dots
  const previewDots = useMemo(() => {
    const rand = seededRand(Math.round(effectSize * 100) + sampleSize * 17);
    const n = 30;
    const dotsA: number[] = [];
    const dotsB: number[] = [];
    for (let i = 0; i < n; i++) {
      const u1 = Math.max(rand(), 1e-9);
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      dotsA.push(z);
    }
    for (let i = 0; i < n; i++) {
      const u1 = Math.max(rand(), 1e-9);
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      dotsB.push(z + effectSize);
    }
    return { dotsA, dotsB };
  }, [effectSize, sampleSize]);

  // Use actual groups if available, otherwise use preview dots
  const displayA = (showGroups && groupA) ? groupA.slice(0, 60) : previewDots.dotsA;
  const displayB = (showGroups && groupB) ? groupB.slice(0, 60) : previewDots.dotsB;

  const allVals = [...displayA, ...displayB];
  const minVal = Math.min(...allVals) - 0.3;
  const maxVal = Math.max(...allVals) + 0.3;
  const range = maxVal - minVal || 1;

  const meanA = calcMean(displayA);
  const meanB = calcMean(displayB);

  // SVG dimensions
  const W = 480;
  const H = 200;
  const PAD = { l: 40, r: 20, t: 20, b: 30 };
  const IW = W - PAD.l - PAD.r;
  const IH = H - PAD.t - PAD.b;

  // Group A occupies left half, Group B occupies right half
  const midX = PAD.l + IW / 2;
  const groupACenter = PAD.l + IW * 0.25;
  const groupBCenter = PAD.l + IW * 0.75;

  function dotY(val: number): number {
    return PAD.t + IH - ((val - minVal) / range) * IH;
  }

  function jitterX(i: number, groupOffset: number): number {
    const seed = (i * 7919 + groupOffset * 1234567) & 0xfffff;
    const j = ((seed % 100) / 100 - 0.5) * 28;
    return j;
  }

  const meanAX = groupACenter;
  const meanBX = groupBCenter;
  const meanAY = dotY(meanA);
  const meanBY = dotY(meanB);

  const diff = Math.abs(meanB - meanA);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Data Groups
        </p>
        {!showGroups && (
          <span className="text-[10px] text-[#334155] italic">Preview (deterministic)</span>
        )}
        {showGroups && (
          <span className="text-[10px] text-[#3bb4a4]">Showing last experiment</span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
        {/* Divider */}
        <line
          x1={midX} y1={PAD.t}
          x2={midX} y2={PAD.t + IH}
          stroke="#1e293b" strokeWidth="1" strokeDasharray="4,3"
        />

        {/* Group labels */}
        <text x={groupACenter} y={PAD.t - 6} textAnchor="middle" fill="#3bb4a4" fontSize="15" fontWeight="600">
          Group A (Control)
        </text>
        <text x={groupBCenter} y={PAD.t - 6} textAnchor="middle" fill="#1e5d8a" fontSize="15" fontWeight="600">
          Group B (Treatment)
        </text>

        {/* Y-axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const val = minVal + t * range;
          const y = PAD.t + IH - t * IH;
          return (
            <g key={t}>
              <line x1={PAD.l - 4} y1={y} x2={PAD.l} y2={y} stroke="#334155" strokeWidth="1" />
              <text x={PAD.l - 6} y={y + 5} textAnchor="end" fill="#475569" fontSize="15">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Baseline axis */}
        <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

        {/* Group A dots */}
        {displayA.map((v, i) => (
          <circle
            key={`a${i}`}
            cx={groupACenter + jitterX(i, 0)}
            cy={dotY(v)}
            r="3"
            fill="#3bb4a4"
            opacity="0.55"
          />
        ))}

        {/* Group B dots */}
        {displayB.map((v, i) => (
          <circle
            key={`b${i}`}
            cx={groupBCenter + jitterX(i, 1)}
            cy={dotY(v)}
            r="3"
            fill="#1e5d8a"
            opacity="0.7"
          />
        ))}

        {/* Mean line A */}
        <line
          x1={groupACenter - 22} y1={meanAY}
          x2={groupACenter + 22} y2={meanAY}
          stroke="#3bb4a4" strokeWidth="2.5"
        />
        <text x={groupACenter + 26} y={meanAY + 4} fill="#3bb4a4" fontSize="15" fontWeight="600">
          x̄={meanA.toFixed(2)}
        </text>

        {/* Mean line B */}
        <line
          x1={groupBCenter - 22} y1={meanBY}
          x2={groupBCenter + 22} y2={meanBY}
          stroke="var(--color-accent)" strokeWidth="2.5"
        />
        <text x={groupBCenter + 26} y={meanBY + 4} fill="var(--color-accent)" fontSize="15" fontWeight="600">
          x̄={meanB.toFixed(2)}
        </text>

        {/* Difference annotation */}
        {effectSize > 0 && (
          <g>
            <line
              x1={midX - 4} y1={meanAY}
              x2={midX - 4} y2={meanBY}
              stroke="#3bb4a4" strokeWidth="1" strokeDasharray="3,2"
            />
            <text
              x={midX - 8}
              y={(meanAY + meanBY) / 2 + 4}
              textAnchor="end"
              fill="#3bb4a4"
              fontSize="15"
            >
              Δ={diff.toFixed(2)}
            </text>
          </g>
        )}
        {effectSize === 0 && (
          <text
            x={midX - 8}
            y={(meanAY + meanBY) / 2 + 4}
            textAnchor="end"
            fill="#475569"
            fontSize="15"
          >
            Δ≈0
          </text>
        )}

        {/* n label */}
        <text x={groupACenter} y={PAD.t + IH + 18} textAnchor="middle" fill="#475569" fontSize="15">
          n={sampleSize}
        </text>
        <text x={groupBCenter} y={PAD.t + IH + 18} textAnchor="middle" fill="#475569" fontSize="15">
          n={sampleSize}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3bb4a4]" />
          <span className="text-[10px] text-[#94a3b8]">Group A: mean=0</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1e5d8a]" />
          <span className="text-[10px] text-[#94a3b8]">Group B: mean={effectSize.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-0.5 bg-[var(--color-accent)]" />
          <span className="text-[10px] text-[#94a3b8]">Group mean</span>
        </div>
      </div>
    </div>
  );
}
