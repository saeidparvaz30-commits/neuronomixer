"use client";

import React, { useState } from "react";
import { SPURIOUS_EXAMPLES, pearsonR, linearRegression } from "./types";

// ── Mini chart ─────────────────────────────────────────────────────────────
const CW = 220, CH = 130, CP = { l: 24, r: 8, t: 8, b: 24 };
const CIW = CW - CP.l - CP.r;
const CIH = CH - CP.t - CP.b;

function MiniChart({ data, color = "#3bb4a4" }: { data: { x: number; y: number }[]; color?: string }) {
  if (data.length === 0) return null;
  const xs = data.map(p => p.x), ys = data.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xPad = (xMax - xMin) * 0.08 || 0.5;
  const yPad = (yMax - yMin) * 0.08 || 0.5;
  const tx = (v: number) => CP.l + ((v - xMin + xPad) / (xMax - xMin + 2 * xPad)) * CIW;
  const ty = (v: number) => CP.t + (1 - (v - yMin + yPad) / (yMax - yMin + 2 * yPad)) * CIH;
  const reg = linearRegression(data);

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" className="block">
      <line x1={CP.l} y1={CP.t} x2={CP.l} y2={CP.t + CIH} stroke="#334155" strokeWidth="1" />
      <line x1={CP.l} y1={CP.t + CIH} x2={CW - CP.r} y2={CP.t + CIH} stroke="#334155" strokeWidth="1" />
      <line
        x1={tx(xMin - xPad)} y1={ty(reg.intercept + reg.slope * (xMin - xPad))}
        x2={tx(xMax + xPad)} y2={ty(reg.intercept + reg.slope * (xMax + xPad))}
        stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.8"
      />
      {data.map((pt, i) => <circle key={i} cx={tx(pt.x)} cy={ty(pt.y)} r="4.5" fill={color} opacity="0.9" />)}
    </svg>
  );
}

function generateRandomPair(n = 18) {
  return Array.from({ length: n }, () => ({ x: Math.random() * 100, y: Math.random() * 100 }));
}

interface Props { onGenerate?: (count: number) => void }

export default function SpuriousCorrelationSandbox({ onGenerate }: Props) {
  const [generated, setGenerated] = useState<{ x: number; y: number }[][]>([]);
  const [count, setCount] = useState(0);

  function handleGenerate() {
    const pair = generateRandomPair();
    setGenerated(prev => [...prev.slice(-2), pair]);
    const next = count + 1;
    setCount(next);
    onGenerate?.(next);
  }

  return (
    <div>
      {/* Famous examples */}
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
        Famous Real Spurious Correlations
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {SPURIOUS_EXAMPLES.map(ex => (
          <div key={ex.id} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-3">
            <p className="text-[11px] font-semibold text-white mb-0.5 leading-snug">{ex.title}</p>
            <p className="text-[9px] text-[#475569] mb-2">{ex.source}</p>
            <MiniChart data={ex.data} color="#ef4444" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[9px] text-[#475569] truncate max-w-[120px]">{ex.var1Label}</span>
              <span className="text-[12px] font-bold text-[#ef4444]">r = {ex.r}</span>
            </div>
            <p className="text-[9px] text-[#475569] mt-0.5 truncate">{ex.var2Label}</p>
          </div>
        ))}
      </div>

      {/* Random generator */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] font-semibold text-white">Random Correlation Generator</p>
            <p className="text-[11px] text-[#475569]">Two completely unrelated random variables</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-[#475569] uppercase tracking-wide">Generated</p>
            <p className="text-[20px] font-black text-[#3bb4a4]">{count}</p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          className="w-full py-2.5 rounded-xl border border-[#334155] text-white text-[12px] font-semibold hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors mb-3"
        >
          Generate Random Pair →
        </button>

        {generated.length > 0 && (
          <>
            <style>{`
              @keyframes spurious-beam-spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
              }
            `}</style>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {generated.map((pair, i) => {
                const r = pearsonR(pair);
                const strong = Math.abs(r) > 0.35;
                return (
                  <div key={i} className="relative rounded-xl overflow-hidden" style={{ padding: "2px" }}>
                    {/* Border base */}
                    <div
                      className="absolute inset-0 rounded-xl transition-colors duration-300"
                      style={{ background: strong ? "var(--color-accent)" : "#1e293b" }}
                    />
                    {/* Spinning beam — only on high-correlation cards */}
                    {strong && (
                      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                        <div
                          style={{
                            position: "absolute",
                            width: "200%",
                            height: "200%",
                            top: "-50%",
                            left: "-50%",
                            background: `conic-gradient(from 0deg, transparent 0%, #d4af3788 7%, var(--color-accent) 12%, #d4af3788 17%, transparent 24%)`,
                            transformOrigin: "50% 50%",
                            animation: "spurious-beam-spin 2s linear infinite",
                            animationDelay: `${-(i * 0.7)}s`,
                          }}
                        />
                      </div>
                    )}
                    {/* Card content */}
                    <div
                      className="relative z-10 rounded-[10px] p-2.5 h-full"
                      style={{ background: "#0f172a" }}
                    >
                      <MiniChart data={pair} color="#3bb4a4" />
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[9px] text-[#475569]">Random A vs B</span>
                        <span className="text-[11px] font-bold" style={{ color: strong ? "var(--color-accent)" : "#3bb4a4" }}>
                          r = {r.toFixed(2)}
                        </span>
                      </div>
                      {strong && <p className="text-[9px] text-[var(--color-accent)] mt-0.5">Surprisingly high: pure chance!</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="text-[10px] text-[#475569] mt-3 leading-relaxed border-t border-white/[0.06] pt-3">
          With enough random pairs, you&apos;ll find high correlations by chance alone.
          This is called <strong className="text-white">p-hacking</strong> or the{" "}
          <strong className="text-white">multiple comparisons problem</strong>.
          The correlation is mathematically real; the causal meaning is not.
        </p>
      </div>
    </div>
  );
}
