"use client";

import React, { useState, useEffect, useRef } from "react";
import { EstimatorView } from "./types";
import { gaussianRandom, computeSE } from "./types";

interface Props {
  sampleSize: number;
  sampleMeans: number[];
  sampleMedians: number[];
  onPanelView: (view: EstimatorView) => void;
  panelsViewed: Set<EstimatorView>;
}

// ── Mini dot plot used in all tabs ────────────────────────────────────────────

const X_MIN = 75;
const X_MAX = 125;
const MINI_W = 200;
const MINI_H = 90;
const PAD = { l: 8, r: 8, t: 12, b: 20 };
const PLOT_W = MINI_W - PAD.l - PAD.r;
const PLOT_H = MINI_H - PAD.t - PAD.b;

function xSvg(val: number, xMin = X_MIN, xMax = X_MAX): number {
  return PAD.l + ((val - xMin) / (xMax - xMin)) * PLOT_W;
}

interface MiniPlotProps {
  data: number[];
  trueMean: number;
  label: string;
  color?: string;
  xMin?: number;
  xMax?: number;
  tickLabels?: number[];
}

function MiniDotPlot({
  data,
  trueMean,
  label,
  color = "#3bb4a4",
  xMin = X_MIN,
  xMax = X_MAX,
  tickLabels,
}: MiniPlotProps) {
  const DOT_R = 2.5;
  const SPACING = DOT_R * 2 + 1.5;
  const buckets: Record<number, number> = {};

  function xSvgLocal(v: number) {
    return PAD.l + ((v - xMin) / (xMax - xMin)) * PLOT_W;
  }

  const dots = data.map((v) => {
    const sx = xSvgLocal(v);
    const bk = Math.round(sx / (DOT_R * 2 + 1));
    const cnt = buckets[bk] ?? 0;
    buckets[bk] = cnt + 1;
    const row = Math.floor(cnt / 2);
    const sign = cnt % 2 === 0 ? 1 : -1;
    const baseY = PAD.t + PLOT_H / 2;
    const y = Math.max(
      PAD.t + DOT_R,
      Math.min(PAD.t + PLOT_H - DOT_R, baseY + sign * row * SPACING)
    );
    return { x: sx, y };
  });

  const muX = xSvgLocal(trueMean);
  const ticks = tickLabels ?? [xMin, Math.round((xMin + xMax) / 2), xMax];

  return (
    <div className="flex flex-col items-center w-full">
      <svg
        viewBox={`0 0 ${MINI_W} ${MINI_H}`}
        width="100%"
        aria-label={label}
      >
        <rect x={PAD.l} y={PAD.t} width={PLOT_W} height={PLOT_H} fill="#0a0e1a" rx={3} />
        <line
          x1={PAD.l} y1={PAD.t + PLOT_H / 2}
          x2={PAD.l + PLOT_W} y2={PAD.t + PLOT_H / 2}
          stroke="#1e293b" strokeWidth={1}
        />
        {/* True mean */}
        <line
          x1={muX} y1={PAD.t}
          x2={muX} y2={PAD.t + PLOT_H}
          stroke="#ef4444" strokeWidth={1.5}
          strokeDasharray="3,2"
        />
        {/* Dots */}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={DOT_R} fill={color} opacity={0.8} />
        ))}
        {/* Empty */}
        {data.length === 0 && (
          <text x={MINI_W / 2} y={PAD.t + PLOT_H / 2 + 3} textAnchor="middle" fontSize={10} fill="#334155">
            No data
          </text>
        )}
        {/* Axis */}
        <line x1={PAD.l} y1={PAD.t + PLOT_H} x2={PAD.l + PLOT_W} y2={PAD.t + PLOT_H} stroke="#334155" strokeWidth={1} />
        {ticks.map((v) => (
          <text key={v} x={xSvgLocal(v)} y={PAD.t + PLOT_H + 13} fontSize={10} fill="#475569" textAnchor="middle">
            {v}
          </text>
        ))}
      </svg>
      <p className="text-[10px] text-[#94a3b8] mt-0.5 text-center">{label}</p>
    </div>
  );
}

// ── Bias Tab ──────────────────────────────────────────────────────────────────

function BiasTab() {
  const [unbiasedData, setUnbiasedData] = useState<number[]>([]);
  const [biasedData, setBiasedData] = useState<number[]>([]);

  useEffect(() => {
    const u: number[] = [];
    const b: number[] = [];
    for (let i = 0; i < 30; i++) {
      u.push(gaussianRandom(100, 5));
      b.push(gaussianRandom(110, 5));
    }
    setUnbiasedData(u);
    setBiasedData(b);
  }, []);

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] mb-4 leading-relaxed">
        An estimator is <span className="text-white font-semibold">unbiased</span> if its expected value equals the true parameter.
        The sample mean x̄ is unbiased:{" "}
        <span className="text-[var(--color-accent)] font-mono">E[x̄] = μ</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <MiniDotPlot
            data={unbiasedData}
            trueMean={100}
            label="Unbiased Estimator (x̄)"
            color="#3bb4a4"
            xMin={75}
            xMax={125}
            tickLabels={[80, 100, 120]}
          />
        </div>
        <div>
          <MiniDotPlot
            data={biasedData}
            trueMean={100}
            label="Biased Estimator (+10)"
            color="var(--color-warning)"
            xMin={75}
            xMax={125}
            tickLabels={[80, 100, 120]}
          />
        </div>
      </div>

      <div className="flex items-start gap-2 text-[10px] text-[#475569] mb-3">
        <span className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0 bg-[#ef4444]" />
        Red dashed line = true mean (μ = 100)
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#0a3b2e] border border-[#3bb4a440] px-3 py-2.5">
          <p className="text-[10px] font-semibold text-[#3bb4a4] mb-1">Unbiased</p>
          <p className="text-[9px] text-[#94a3b8] leading-relaxed">
            Dots center on μ = 100. The average of many estimates equals the true value.
          </p>
        </div>
        <div className="rounded-xl bg-[#3b1a00] border border-[#f9731640] px-3 py-2.5">
          <p className="text-[10px] font-semibold text-[var(--color-warning)] mb-1">Biased (+10)</p>
          <p className="text-[9px] text-[#94a3b8] leading-relaxed">
            Dots center on 110. Systematically misses the true value, even with many samples.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Consistency Tab ───────────────────────────────────────────────────────────

const CONSISTENCY_NS = [5, 20, 100, 500] as const;

function ConsistencyTab() {
  const [plotData, setPlotData] = useState<Record<number, number[]>>({});

  useEffect(() => {
    const result: Record<number, number[]> = {};
    for (const n of CONSISTENCY_NS) {
      const means: number[] = [];
      for (let i = 0; i < 30; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) sum += gaussianRandom(100, 20);
        means.push(sum / n);
      }
      result[n] = means;
    }
    setPlotData(result);
  }, []);

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] mb-4 leading-relaxed">
        A <span className="text-white font-semibold">consistent</span> estimator converges in probability to the
        true value as n grows. For the sample mean this holds because it is unbiased AND its SE → 0 as n → ∞.
        A shrinking SE alone is not enough: an estimator that stays biased is not consistent no matter how
        small its SE gets.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {CONSISTENCY_NS.map((n) => {
          const se = computeSE(20, n);
          return (
            <div key={n}>
              <MiniDotPlot
                data={plotData[n] ?? []}
                trueMean={100}
                label={`n = ${n}`}
                color="#3bb4a4"
                xMin={60}
                xMax={140}
                tickLabels={[70, 100, 130]}
              />
              <p className="text-[9px] text-[#475569] text-center mt-0.5">
                SE = {se.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>

      {/* SE summary */}
      <div className="rounded-xl bg-[#1e293b] px-4 py-3">
        <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-[1px] mb-2">
          SE Comparison
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {CONSISTENCY_NS.map((n) => {
            const se = computeSE(20, n);
            const width = Math.round((se / computeSE(20, 5)) * 100);
            return (
              <div key={n} className="flex items-center gap-2">
                <span className="text-[10px] text-[#475569] w-14">n = {n}:</span>
                <div className="flex-1 min-w-[80px] h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-[#3bb4a4]"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#3bb4a4]">
                  {se.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-[#3bb4a4] mt-3">
        As n → ∞, SE → 0. The estimator converges to the true value.
      </p>
    </div>
  );
}

// ── Efficiency Tab ────────────────────────────────────────────────────────────

function EfficiencyTab({
  sampleSize,
  sampleMeans,
  sampleMedians,
}: {
  sampleSize: number;
  sampleMeans: number[];
  sampleMedians: number[];
}) {
  const seMean = computeSE(20, sampleSize);
  const seMedian = 1.2533 * computeSE(20, sampleSize); // √(π/2) ≈ 1.2533

  const relativePct = ((seMedian - seMean) / seMean) * 100;

  // Bar widths relative to median SE
  const meanBarW = Math.round((seMean / seMedian) * 100);
  const medianBarW = 100;

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] mb-4 leading-relaxed">
        A more <span className="text-white font-semibold">efficient</span> estimator has a smaller SE for the same n.
        For normal data, the sample mean beats the median.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <MiniDotPlot
            data={sampleMeans}
            trueMean={100}
            label="Sample Mean (x̄)"
            color="#3bb4a4"
            xMin={60}
            xMax={140}
            tickLabels={[70, 100, 130]}
          />
          <p className="text-[9px] text-center text-[#475569] mt-0.5">
            SE = σ/√n = {seMean.toFixed(3)}
          </p>
        </div>
        <div>
          <MiniDotPlot
            data={sampleMedians}
            trueMean={100}
            label="Sample Median"
            color="#a855f7"
            xMin={60}
            xMax={140}
            tickLabels={[70, 100, 130]}
          />
          <p className="text-[9px] text-center text-[#475569] mt-0.5">
            SE ≈ 1.253 × σ/√n = {seMedian.toFixed(3)}
          </p>
        </div>
      </div>

      {/* SE comparison bars */}
      <div className="rounded-xl bg-[#1e293b] px-4 py-3 mb-3">
        <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-[1px] mb-2">
          SE at n = {sampleSize}
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#94a3b8] w-24 flex-shrink-0">Sample Mean</span>
            <div className="flex-1 h-2 bg-[#0f172a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3bb4a4] rounded-full transition-all"
                style={{ width: `${meanBarW}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#3bb4a4] w-12 text-right">
              {seMean.toFixed(3)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#94a3b8] w-24 flex-shrink-0">Sample Median</span>
            <div className="flex-1 h-2 bg-[#0f172a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#a855f7] rounded-full transition-all"
                style={{ width: `${medianBarW}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#a855f7] w-12 text-right">
              {seMedian.toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-[#3bb4a4] leading-relaxed">
        For normal data, the median&apos;s SE is{" "}
        <span className="font-semibold">~{relativePct.toFixed(0)}% larger</span> than the mean&apos;s at the same n.
        Efficiency compares VARIANCES, not SEs: the median&apos;s asymptotic relative efficiency is{" "}
        <span className="font-mono font-bold">
          ARE = (SE ratio)² = {((seMean / seMedian) ** 2 * 100).toFixed(0)}%
        </span>{" "}
        (exactly 2/π ≈ 63.7%), so the median needs about {(1 / ((seMean / seMedian) ** 2)).toFixed(2)}× as many
        observations to match the mean&apos;s precision.
      </p>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

const TABS: { key: EstimatorView; label: string }[] = [
  { key: "bias", label: "Bias" },
  { key: "consistency", label: "Consistency" },
  { key: "efficiency", label: "Efficiency" },
];

export default function EstimatorPropertiesPanel({
  sampleSize,
  sampleMeans,
  sampleMedians,
  onPanelView,
  panelsViewed,
}: Props) {
  const [activeTab, setActiveTab] = useState<EstimatorView>("bias");

  function handleTabClick(key: EstimatorView) {
    setActiveTab(key);
    onPanelView(key);
  }

  // Track initial tab view
  const initialViewed = useRef(false);
  useEffect(() => {
    if (!initialViewed.current) {
      initialViewed.current = true;
      onPanelView("bias");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="text-[14px] font-bold text-white">
          Estimator Properties
        </h3>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#475569]">Explored:</span>
          {TABS.map(({ key }) => (
            <div
              key={key}
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{ background: panelsViewed.has(key) ? "#3bb4a4" : "#1e293b" }}
            />
          ))}
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 mb-5 border-b border-white/[0.06] pb-3">
        {TABS.map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => handleTabClick(key)}
              className="px-4 py-1.5 rounded-xl text-[12px] font-semibold border transition-all"
              style={{
                borderColor: active ? "var(--color-accent)" : "#1e293b",
                color: active ? "var(--color-accent)" : "#475569",
                background: active ? "#d4af3718" : "transparent",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "bias" && <BiasTab />}
        {activeTab === "consistency" && <ConsistencyTab />}
        {activeTab === "efficiency" && (
          <EfficiencyTab
            sampleSize={sampleSize}
            sampleMeans={sampleMeans}
            sampleMedians={sampleMedians}
          />
        )}
      </div>
    </div>
  );
}
