"use client";

import React, { useEffect, useMemo, useRef } from "react";

// Generate 15 correlated 2D points deterministically
function generateCorrelatedData(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 15; i++) {
    const t = i / 14; // 0..1
    // Deterministic "noise" using sin
    const nx = Math.sin(i * 3.7 + 1.2) * 0.08;
    const ny = Math.sin(i * 5.3 + 2.1) * 0.08;
    const x = t + nx;
    const y = 0.8 * x + 0.1 + ny;
    points.push({ x, y });
  }
  return points;
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computePCA(points: { x: number; y: number }[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const mx = mean(xs);
  const my = mean(ys);

  const centered = points.map((p) => ({ x: p.x - mx, y: p.y - my }));

  const n = points.length;
  let cxx = 0, cxy = 0, cyy = 0;
  for (const p of centered) {
    cxx += p.x * p.x;
    cxy += p.x * p.y;
    cyy += p.y * p.y;
  }
  cxx /= n; cxy /= n; cyy /= n;

  // Eigenvalues for 2x2 symmetric matrix
  const trace = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const discriminant = Math.sqrt(Math.max(0, (trace / 2) ** 2 - det));
  const lambda1 = trace / 2 + discriminant;
  const lambda2 = trace / 2 - discriminant;

  // PC1 direction: eigenvector for lambda1
  // [cov[0][1], lambda1 - cov[0][0]] normalized
  let pc1x = cxy;
  let pc1y = lambda1 - cxx;
  const len1 = Math.sqrt(pc1x * pc1x + pc1y * pc1y);
  if (len1 > 1e-10) { pc1x /= len1; pc1y /= len1; }
  else { pc1x = 1; pc1y = 0; }

  // PC2 is perpendicular
  const pc2x = -pc1y;
  const pc2y = pc1x;

  const varianceExplained = lambda1 / (lambda1 + lambda2 + 1e-10) * 100;

  // Project onto PCA coordinates
  const pcaPoints = centered.map((p) => ({
    pc1: p.x * pc1x + p.y * pc1y,
    pc2: p.x * pc2x + p.y * pc2y,
  }));

  return { mx, my, pc1x, pc1y, pc2x, pc2y, lambda1, lambda2, varianceExplained, centered, pcaPoints };
}

const W = 320;
const H = 260;
const PAD = { l: 36, r: 16, t: 16, b: 36 };

function scaleX(val: number, min: number, max: number) {
  return PAD.l + ((val - min) / (max - min)) * (W - PAD.l - PAD.r);
}
function scaleY(val: number, min: number, max: number) {
  return PAD.t + ((max - val) / (max - min)) * (H - PAD.t - PAD.b);
}

interface Props {
  onPcaViewed: () => void;
}

export default function PCAVisualizer({ onPcaViewed }: Props) {
  const points = useMemo(() => generateCorrelatedData(), []);
  const pca = useMemo(() => computePCA(points), [points]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fire "PCA viewed" only when the section actually scrolls into view,
  // not on mount (the component may start below the fold).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          onPcaViewed();
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onPcaViewed]);

  // Original scatter bounds
  const origXs = points.map((p) => p.x);
  const origYs = points.map((p) => p.y);
  const xMin = Math.min(...origXs) - 0.1;
  const xMax = Math.max(...origXs) + 0.1;
  const yMin = Math.min(...origYs) - 0.1;
  const yMax = Math.max(...origYs) + 0.1;

  // PCA space bounds
  const pc1s = pca.pcaPoints.map((p) => p.pc1);
  const pc2s = pca.pcaPoints.map((p) => p.pc2);
  const pc1Min = Math.min(...pc1s) - 0.05;
  const pc1Max = Math.max(...pc1s) + 0.05;
  const pc2Min = Math.min(...pc2s) - 0.05;
  const pc2Max = Math.max(...pc2s) + 0.05;

  // PC1 and PC2 arrow scale for original scatter
  const arrowScale = 0.3;
  const centerX = scaleX(pca.mx, xMin, xMax);
  const centerY = scaleY(pca.my, yMin, yMax);

  return (
    <div ref={containerRef} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
      <h2 className="text-xl font-bold text-white mb-1">
        PCA Visualizer
      </h2>
      <p className="text-sm text-[#94a3b8] mb-1 leading-relaxed">
        Principal Component Analysis finds the axes of maximum variance. See how correlated data
        can be rotated to reveal its true structure.
      </p>

      {/* Variance explained badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e5d8a]/20 border border-[#1e5d8a]/30 mb-5">
        <div className="w-2 h-2 rounded-full bg-[#3bb4a4]" />
        <span className="text-sm font-semibold text-[#3bb4a4]">
          PC1 explains {pca.varianceExplained.toFixed(1)}% of variance
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Original scatter with PC arrows */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0a0f1e] p-3">
          <p className="text-[11px] text-[#94a3b8] mb-2 font-semibold">Original Space (X, Y)</p>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 240 }}>
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((v) => {
              const xVal = xMin + v * (xMax - xMin);
              const yVal = yMin + v * (yMax - yMin);
              return (
                <g key={v}>
                  <line x1={scaleX(xVal, xMin, xMax)} y1={PAD.t} x2={scaleX(xVal, xMin, xMax)} y2={H - PAD.b} stroke="#1e293b" strokeWidth={0.8} />
                  <line x1={PAD.l} y1={scaleY(yVal, yMin, yMax)} x2={W - PAD.r} y2={scaleY(yVal, yMin, yMax)} stroke="#1e293b" strokeWidth={0.8} />
                </g>
              );
            })}
            {/* Axes */}
            <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />

            {/* Data points */}
            {points.map((pt, i) => (
              <circle
                key={i}
                cx={scaleX(pt.x, xMin, xMax)}
                cy={scaleY(pt.y, yMin, yMax)}
                r={4}
                fill="#3bb4a4"
                fillOpacity={0.75}
                stroke="#0f172a"
                strokeWidth={1}
              />
            ))}

            {/* PC1 arrow */}
            <defs>
              <marker id="arrow1" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#d4af37" />
              </marker>
              <marker id="arrow2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
              </marker>
            </defs>
            <line
              x1={centerX - pca.pc1x * arrowScale * (W - PAD.l - PAD.r)}
              y1={centerY + pca.pc1y * arrowScale * (H - PAD.t - PAD.b)}
              x2={centerX + pca.pc1x * arrowScale * (W - PAD.l - PAD.r)}
              y2={centerY - pca.pc1y * arrowScale * (H - PAD.t - PAD.b)}
              stroke="#d4af37"
              strokeWidth={2.5}
              markerEnd="url(#arrow1)"
            />
            {/* PC2 arrow */}
            <line
              x1={centerX - pca.pc2x * arrowScale * 0.4 * (W - PAD.l - PAD.r)}
              y1={centerY + pca.pc2y * arrowScale * 0.4 * (H - PAD.t - PAD.b)}
              x2={centerX + pca.pc2x * arrowScale * 0.4 * (W - PAD.l - PAD.r)}
              y2={centerY - pca.pc2y * arrowScale * 0.4 * (H - PAD.t - PAD.b)}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4,3"
              markerEnd="url(#arrow2)"
            />

            {/* Legend */}
            <line x1={PAD.l + 4} y1={14} x2={PAD.l + 22} y2={14} stroke="#d4af37" strokeWidth={2.5} />
            <text x={PAD.l + 26} y={18} fill="#d4af37" fontSize={9}>PC1 (max var)</text>
            <line x1={PAD.l + 4} y1={26} x2={PAD.l + 22} y2={26} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4,3" />
            <text x={PAD.l + 26} y={30} fill="#ef4444" fontSize={9}>PC2 (min var)</text>

            {/* Axis labels */}
            <text x={scaleX(0.5 * (xMin + xMax), xMin, xMax)} y={H - 4} textAnchor="middle" fill="#475569" fontSize={10}>X</text>
            <text x={10} y={scaleY(0.5 * (yMin + yMax), yMin, yMax)} textAnchor="middle" fill="#475569" fontSize={10} transform={`rotate(-90, 10, ${scaleY(0.5 * (yMin + yMax), yMin, yMax)})`}>Y</text>
          </svg>
        </div>

        {/* PCA-rotated scatter */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0a0f1e] p-3">
          <p className="text-[11px] text-[#94a3b8] mb-2 font-semibold">PCA Space (PC1, PC2)</p>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 240 }}>
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((v) => {
              const pc1Val = pc1Min + v * (pc1Max - pc1Min);
              const pc2Val = pc2Min + v * (pc2Max - pc2Min);
              return (
                <g key={v}>
                  <line x1={scaleX(pc1Val, pc1Min, pc1Max)} y1={PAD.t} x2={scaleX(pc1Val, pc1Min, pc1Max)} y2={H - PAD.b} stroke="#1e293b" strokeWidth={0.8} />
                  <line x1={PAD.l} y1={scaleY(pc2Val, pc2Min, pc2Max)} x2={W - PAD.r} y2={scaleY(pc2Val, pc2Min, pc2Max)} stroke="#1e293b" strokeWidth={0.8} />
                </g>
              );
            })}
            {/* Axes */}
            <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />

            {/* Zero lines */}
            {pc2Min < 0 && pc2Max > 0 && (
              <line
                x1={PAD.l} y1={scaleY(0, pc2Min, pc2Max)}
                x2={W - PAD.r} y2={scaleY(0, pc2Min, pc2Max)}
                stroke="#334155" strokeWidth={0.8} strokeDasharray="4,3"
              />
            )}
            {pc1Min < 0 && pc1Max > 0 && (
              <line
                x1={scaleX(0, pc1Min, pc1Max)} y1={PAD.t}
                x2={scaleX(0, pc1Min, pc1Max)} y2={H - PAD.b}
                stroke="#334155" strokeWidth={0.8} strokeDasharray="4,3"
              />
            )}

            {/* PCA points */}
            {pca.pcaPoints.map((pt, i) => (
              <circle
                key={i}
                cx={scaleX(pt.pc1, pc1Min, pc1Max)}
                cy={scaleY(pt.pc2, pc2Min, pc2Max)}
                r={4}
                fill="#d4af37"
                fillOpacity={0.8}
                stroke="#0f172a"
                strokeWidth={1}
              />
            ))}

            {/* Variance bar */}
            <rect x={PAD.l} y={PAD.t + 4} width={(pca.varianceExplained / 100) * (W - PAD.l - PAD.r)} height={5} fill="#d4af37" fillOpacity={0.3} rx={2} />
            <text x={PAD.l + 2} y={PAD.t + 17} fill="#d4af37" fontSize={9}>{pca.varianceExplained.toFixed(1)}% of variance in PC1</text>

            {/* Axis labels */}
            <text x={scaleX((pc1Min + pc1Max) / 2, pc1Min, pc1Max)} y={H - 4} textAnchor="middle" fill="#d4af37" fontSize={10}>PC1</text>
            <text x={10} y={scaleY((pc2Min + pc2Max) / 2, pc2Min, pc2Max)} textAnchor="middle" fill="#475569" fontSize={10} transform={`rotate(-90, 10, ${scaleY((pc2Min + pc2Max) / 2, pc2Min, pc2Max)})`}>PC2</text>
          </svg>
        </div>
      </div>

      {/* Explanation */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#1e293b]/50 border border-[#1e293b] p-3">
          <p className="text-[11px] font-semibold text-[#d4af37] mb-1">Eigenvalue 1 (PC1)</p>
          <p className="text-lg font-bold text-white">{pca.lambda1.toFixed(4)}</p>
          <p className="text-[11px] text-[#94a3b8]">Variance along principal axis</p>
        </div>
        <div className="rounded-xl bg-[#1e293b]/50 border border-[#1e293b] p-3">
          <p className="text-[11px] font-semibold text-[#ef4444] mb-1">Eigenvalue 2 (PC2)</p>
          <p className="text-lg font-bold text-white">{pca.lambda2.toFixed(4)}</p>
          <p className="text-[11px] text-[#94a3b8]">Variance along secondary axis</p>
        </div>
      </div>

      <p className="text-[11px] text-[#475569] mt-3">
        The correlated structure in the original space is revealed as spread along PC1 in the transformed space.
        Dropping PC2 retains {pca.varianceExplained.toFixed(1)}% of total variance.
      </p>
    </div>
  );
}
