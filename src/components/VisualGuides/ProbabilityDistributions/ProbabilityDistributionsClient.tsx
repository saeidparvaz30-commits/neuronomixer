"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { DistId, ParamValues, DISTRIBUTIONS, DIST_ORDER, computePDF } from "./types";

// ── Mini curve for card previews ─────────────────────────────────────────────
function MiniCurve({ id, color }: { id: DistId; color: string }) {
  const meta = DISTRIBUTIONS[id];
  const params = meta.defaultParams;
  const [xMin, xMax] = meta.xRange(params);
  const W = 180, H = 70;
  const N = meta.type === "discrete" ? Math.min(30, Math.round(xMax - xMin) + 1) : 80;
  const pts = Array.from({ length: N }, (_, i) => {
    const x = xMin + (i / (N - 1)) * (xMax - xMin);
    return { x, y: computePDF(id, x, params) };
  });
  const maxY = Math.max(...pts.map(p => p.y), 0.001);
  const tx = (x: number) => 4 + ((x - xMin) / (xMax - xMin)) * (W - 8);
  const ty = (y: number) => H - 4 - (y / maxY) * (H - 8);

  if (meta.type === "discrete") {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        {pts.map((p, i) => {
          const bw = Math.max(1, (W - 8) / N - 1);
          const bh = (p.y / maxY) * (H - 8);
          return <rect key={i} x={tx(p.x) - bw/2} y={ty(p.y)} width={bw} height={bh}
            fill={color} opacity="0.7" rx="1" />;
        })}
      </svg>
    );
  }

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${tx(p.x).toFixed(1)} ${ty(p.y).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

// ── Distribution Panel ───────────────────────────────────────────────────────
function DistributionPanel({
  id, params, onParamChange, onClose, openCount,
}: {
  id: DistId; params: ParamValues; onParamChange: (k: string, v: number) => void;
  onClose: () => void; openCount: React.MutableRefObject<Record<DistId, boolean>>;
}) {
  const meta = DISTRIBUTIONS[id];
  const [xMin, xMax] = meta.xRange(params);
  const N = meta.type === "discrete" ? Math.min(50, Math.round(xMax - xMin) + 1) : 200;
  const W = 480, H = 240, PAD = { l: 32, r: 12, t: 12, b: 28 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  const pts = useMemo(() => Array.from({ length: N }, (_, i) => {
    const x = xMin + (i / (N - 1)) * (xMax - xMin);
    return { x, y: computePDF(id, x, params) };
  }), [id, params, xMin, xMax, N]);

  const maxY = Math.max(...pts.map(p => p.y), 0.001);
  const tx = (x: number) => PAD.l + ((x - xMin) / (xMax - xMin)) * IW;
  const ty = (y: number) => PAD.t + IH - (y / maxY) * IH;

  const stats = meta.stats(params);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border bg-[#0f172a] p-5"
      style={{ borderColor: meta.color + "50" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] mb-1" style={{ color: meta.color }}>
            {meta.label} Distribution
          </p>
          <p className="text-[12px] text-[#94a3b8]">{meta.shortDesc}</p>
        </div>
        <button onClick={onClose} className="text-[#475569] hover:text-white transition-colors text-[16px]">✕</button>
      </div>

      {/* Curve */}
      <div className="mb-4">
        <p className="text-[10px] text-[#475569] mb-1">
          {meta.type === "discrete" ? "Probability Mass Function (PMF)" : "Probability Density Function (PDF)"}
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%">
          <line x1={PAD.l} y1={PAD.t + IH} x2={W - PAD.r} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
          {meta.type === "discrete" ? (
            pts.map((p, i) => {
              const bw = Math.max(2, IW / N - 1);
              const bh = (p.y / maxY) * IH;
              return <motion.rect key={i} x={tx(p.x) - bw/2} animate={{ height: bh, y: PAD.t + IH - bh }}
                transition={{ duration: 0.3, delay: i * 0.01 }} width={bw} fill={meta.color} opacity="0.75" rx="1" />;
            })
          ) : (
            <motion.path
              d={pts.map((p, i) => `${i===0?"M":"L"} ${tx(p.x).toFixed(1)} ${ty(p.y).toFixed(1)}`).join(" ")}
              fill="none" stroke={meta.color} strokeWidth="2"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
            />
          )}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const v = xMin + t * (xMax - xMin);
            return <text key={t} x={tx(v)} y={PAD.t + IH + 12} textAnchor="middle" fill="#475569" fontSize="8">{v.toFixed(1)}</text>;
          })}
        </svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Parameters */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">Parameters</p>
          {meta.params.map(p => (
            <div key={p.key} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-white">{p.label}</span>
                <span className="text-[11px] font-mono text-[#d4af37]">{params[p.key]?.toFixed(2)}</span>
              </div>
              <input type="range" min={p.min} max={p.max} step={p.step} value={params[p.key] ?? p.default}
                onChange={e => onParamChange(p.key, Number(e.target.value))}
                className="w-full" style={{ accentColor: meta.color }} />
            </div>
          ))}
        </div>

        {/* Stats + use cases */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">Statistics</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-[#1e293b] p-2">
                  <p className="text-[8px] text-[#475569]">{k}</p>
                  <p className="text-[12px] font-bold font-mono text-white">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">Use Cases</p>
            <ul className="space-y-1">
              {meta.useCases.map(uc => (
                <li key={uc} className="text-[10px] text-[#94a3b8] flex items-start gap-1.5">
                  <span style={{ color: meta.color }}>•</span> {uc}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ProbabilityDistributionsClient() {
  const { data: session } = useSession();
  const [selectedId, setSelectedId] = useState<DistId | null>(null);
  const [params, setParams] = useState<Record<DistId, ParamValues>>(
    Object.fromEntries(DIST_ORDER.map(id => [id, { ...DISTRIBUTIONS[id].defaultParams }])) as Record<DistId, ParamValues>
  );
  const [distOpened, setDistOpened] = useState<Set<DistId>>(new Set());
  const [adjustmentsCount, setAdjustmentsCount] = useState(0);
  const openedRef = useRef<Record<DistId, boolean>>({} as Record<DistId, boolean>);
  const completionFired = useRef(false);

  const allComplete = distOpened.size >= 4 && adjustmentsCount >= 8;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "probability-distributions", score: 8 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function handleSelect(id: DistId) {
    setSelectedId(prev => prev === id ? null : id);
    setDistOpened(prev => new Set([...prev, id]));
  }

  function handleParamChange(id: DistId, key: string, val: number) {
    setParams(prev => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
    setAdjustmentsCount(prev => prev + 1);
  }

  const progress = [
    { label: `Distributions explored: ${distOpened.size}/4`, done: distOpened.size >= 4 },
    { label: `Parameters adjusted: ${adjustmentsCount}/8`, done: adjustmentsCount >= 8 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Probability Distributions</span>
        </nav>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Statistics</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Probability Distributions <span className="text-[var(--color-accent)]">Gallery</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Explore 8 probability distributions. Click any card to adjust parameters, view the PDF/PMF,
            statistics, and real-world use cases.
          </p>
        </section>

        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Gallery */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {DIST_ORDER.map(id => {
            const meta = DISTRIBUTIONS[id];
            const isSelected = selectedId === id;
            return (
              <motion.button
                key={id}
                onClick={() => handleSelect(id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-2xl border bg-[#0f172a] p-3 text-left transition-colors"
                style={{ borderColor: isSelected ? meta.color : "#1e293b", background: isSelected ? meta.color + "08" : "#0f172a" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-bold text-white">{meta.label}</p>
                  <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded" style={{ background: meta.color + "20", color: meta.color }}>
                    {meta.type === "discrete" ? "PMF" : "PDF"}
                  </span>
                </div>
                <p className="text-[9px] text-[#475569] mb-2 leading-tight">{meta.shortDesc}</p>
                <MiniCurve id={id} color={meta.color} />
                <p className="text-[8px] text-[#334155] mt-1">{meta.params.map(p => p.key).join(", ")}</p>
              </motion.button>
            );
          })}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedId && (
            <DistributionPanel
              key={selectedId}
              id={selectedId}
              params={params[selectedId]}
              onParamChange={(k, v) => handleParamChange(selectedId, k, v)}
              onClose={() => setSelectedId(null)}
              openCount={openedRef}
            />
          )}
        </AnimatePresence>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/bayes-theorem"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Previous Guide
          </Link>
          <Link href="/visual-guides"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            All Guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
