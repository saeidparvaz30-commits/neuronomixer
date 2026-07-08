"use client";

import React, { useRef, useState } from "react";
import { runPermutation, TestType } from "./types";

interface Props {
  groupA: number[];
  groupB: number[];
  tStatistic: number | null;
  testType: TestType;
  alpha: number;
  permutationResults: number[];
  significantPermutations: number;
  onPermutationsComplete: (newResults: number[], significantCount: number) => void;
}

const BINS = 20;
const PW = 380, PH = 110;
const PP = { l: 20, r: 12, t: 8, b: 20 };

function PermHistogram({ permStats, observedT, testType }: { permStats: number[]; observedT: number | null; testType: TestType }) {
  if (permStats.length === 0) return null;
  const IW = PW - PP.l - PP.r, IH = PH - PP.t - PP.b;
  const min = -4, max = 4;
  const binWidth = (max - min) / BINS;

  const counts = Array.from({ length: BINS }, (_, i) => {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    return permStats.filter(v => v >= lo && (i === BINS - 1 ? v <= hi : v < hi)).length;
  });
  const maxC = Math.max(...counts, 1);
  const tx = (v: number) => PP.l + ((v - min) / (max - min)) * IW;

  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} width="100%">
      <line x1={PP.l} y1={PP.t + IH} x2={PW - PP.r} y2={PP.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PP.l} y1={PP.t} x2={PP.l} y2={PP.t + IH} stroke="#334155" strokeWidth="1" />

      {counts.map((c, i) => {
        const x = PP.l + (i / BINS) * IW;
        const bw = IW / BINS - 0.5;
        const bh = (c / maxC) * IH;
        return (
          <rect
            key={i}
            x={x} y={PP.t + IH - bh}
            width={bw} height={bh}
            fill="#3bb4a4" opacity="0.65"
          />
        );
      })}

      {observedT !== null && (
        <>
          <line
            x1={tx(observedT)} y1={PP.t}
            x2={tx(observedT)} y2={PP.t + IH}
            stroke="var(--color-accent)" strokeWidth="2"
          />
          <text x={tx(observedT) + 3} y={PP.t + 10} fill="var(--color-accent)" fontSize="8" fontWeight="600">
            t={observedT.toFixed(2)}
          </text>
          {testType === "two-tailed" && Math.abs(observedT) > 0.1 && (
            <line
              x1={tx(-Math.abs(observedT))} y1={PP.t}
              x2={tx(-Math.abs(observedT))} y2={PP.t + IH}
              stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="3 2"
            />
          )}
        </>
      )}

      {[-4, -2, 0, 2, 4].map(v => (
        <text key={v} x={tx(v)} y={PP.t + IH + 12} textAnchor="middle" fill="#475569" fontSize="7">
          {v}
        </text>
      ))}
      <text x={PP.l + IW / 2} y={PH - 2} textAnchor="middle" fill="#475569" fontSize="7">
        Permutation t-statistics
      </text>
    </svg>
  );
}

export default function PermutationCounter({
  groupA, groupB, tStatistic, testType, alpha,
  permutationResults, significantPermutations,
  onPermutationsComplete,
}: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalTarget, setTotalTarget] = useState(0);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasData = groupA.length > 0 && tStatistic !== null;
  const total = permutationResults.length;

  function runBatch(count: number) {
    if (!hasData || isRunning) return;
    setIsRunning(true);
    setProgress(0);
    setTotalTarget(count);

    let done = 0;
    const allNew: number[] = [];

    function tick() {
      const batch = Math.min(50, count - done);
      for (let i = 0; i < batch; i++) {
        allNew.push(runPermutation(groupA, groupB));
      }
      done += batch;
      setProgress(done);

      if (done < count) {
        animRef.current = setTimeout(tick, 30);
      } else {
        const combined = [...permutationResults, ...allNew];
        // "More extreme than observed" must match the selected test type:
        // two-tailed counts both tails via |t|, one-tailed (H1: B > A) counts
        // only shuffles at or above the observed t.
        const sigCount = tStatistic !== null
          ? (testType === "two-tailed"
              ? combined.filter(s => Math.abs(s) >= Math.abs(tStatistic)).length
              : combined.filter(s => s >= tStatistic).length)
          : 0;
        onPermutationsComplete(allNew, sigCount);
        setIsRunning(false);
        setProgress(0);
        setTotalTarget(0);
      }
    }
    tick();
  }

  const permPct = total > 0 ? (significantPermutations / total * 100).toFixed(1) : null;
  const theoreticalPctLabel = tStatistic !== null && total === 0 ? "Run permutations to compare" : null;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[12px] font-bold text-white mb-1">Permutation Test</p>
      <p className="text-[10px] text-[#475569] mb-3 leading-relaxed">
        Randomly shuffle group labels and recompute the t-statistic. How often does chance produce a result as extreme as observed?
      </p>

      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => runBatch(100)}
          disabled={isRunning || !hasData}
          className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-30"
        >
          Shuffle 100×
        </button>
        <button
          onClick={() => runBatch(1000)}
          disabled={isRunning || !hasData}
          className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-30"
        >
          Run 1000×
        </button>
      </div>

      {!hasData && (
        <p className="text-[11px] text-[#334155]">Run an experiment first.</p>
      )}

      {isRunning && totalTarget > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-[#475569] mb-1">
            <span>Running permutations…</span>
            <span>{progress} / {totalTarget}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#3bb4a4] transition-all"
              style={{ width: `${(progress / totalTarget) * 100}%` }}
            />
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#94a3b8]">Significant permutations</span>
            <span
              className="text-[13px] font-black font-mono"
              style={{ color: permPct && parseFloat(permPct) < alpha * 100 + 2 ? "var(--color-accent)" : "#ef4444" }}
            >
              {significantPermutations} / {total} ({permPct}%)
            </span>
          </div>
          <p className="text-[10px] text-[#475569] leading-relaxed">
            Permutation p ≈ <strong className="text-white">{permPct}%</strong>. This is how often random shuffling beats or matches your observed t-statistic.
            {theoreticalPctLabel && ` ${theoreticalPctLabel}.`}
          </p>

          <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mt-3 mb-1">
            Distribution of shuffled t-statistics
          </p>
          <PermHistogram permStats={permutationResults} observedT={tStatistic} testType={testType} />
          <p className="text-[9px] text-[#334155]">
            Gold line = observed t. Bars = shuffled t-statistics. Under null hypothesis, gold should be in the tail.
          </p>
        </div>
      )}
    </div>
  );
}
