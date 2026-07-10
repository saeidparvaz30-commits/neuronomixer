"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GRID,
  ORACLE,
  BUDGET,
  N_CELLS,
  DEFAULT_SEED,
  StrategyId,
  RunResult,
  strategyTrials,
  buildResult,
} from "./tuningMath";
import HeatGrid from "./HeatGrid";

interface Props {
  results: Partial<Record<StrategyId, RunResult>>;
  onResult: (result: RunResult) => void;
}

const STRATEGIES: {
  id: StrategyId;
  name: string;
  blurb: string;
  usesSeed: boolean;
}[] = [
  {
    id: "grid",
    name: "Grid",
    blurb: "An evenly spaced 4 by 3 lattice. Systematic, but rigid: it spends trials on rows and columns that may not matter.",
    usesSeed: false,
  },
  {
    id: "random",
    name: "Random",
    blurb: "12 uniform draws without replacement. No structure, no assumptions, surprisingly hard to beat.",
    usesSeed: true,
  },
  {
    id: "adaptive",
    name: "Adaptive",
    blurb: "4 random probes, then each trial checks a neighbor of the best cell found so far. Exploit what you learn.",
    usesSeed: true,
  },
];

const REVEAL_MS = 160;

export default function SearchLab({ results, onResult }: Props) {
  const [strategy, setStrategy] = useState<StrategyId>("grid");
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [running, setRunning] = useState(false);
  const [liveTrials, setLiveTrials] = useState<number[]>([]);
  const [statusMsg, setStatusMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  const handleRun = () => {
    if (running) return;
    const trials = strategyTrials(strategy, seed);
    const finished = buildResult(strategy, seed, trials);
    setLiveTrials([]);
    setStatusMsg("");
    setRunning(true);
    let k = 0;
    timerRef.current = setInterval(() => {
      k++;
      setLiveTrials(trials.slice(0, k));
      if (k >= trials.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setRunning(false);
        const bc = GRID[finished.bestIndex];
        setStatusMsg(
          `${STRATEGIES.find((s) => s.id === finished.strategy)?.name} search done: best validation accuracy ${(finished.bestValAcc * 100).toFixed(1)} percent at depth ${bc.depth}, min leaf ${bc.minLeaf}, found on trial ${finished.bestTrial} of ${BUDGET}.`
        );
        onResult(finished);
      }
    }, REVEAL_MS);
  };

  const markers = useMemo(() => {
    const m = new Map<number, number>();
    liveTrials.forEach((cellIdx, i) => m.set(cellIdx, i + 1));
    return m;
  }, [liveTrials]);

  const bestSoFar = useMemo(() => {
    if (liveTrials.length === 0) return null;
    let best = liveTrials[0];
    let bestAt = 1;
    liveTrials.forEach((cellIdx, i) => {
      if (GRID[cellIdx].valAcc > GRID[best].valAcc) {
        best = cellIdx;
        bestAt = i + 1;
      }
    });
    return { cell: GRID[best], trial: bestAt };
  }, [liveTrials]);

  const yourBest = useMemo(() => {
    const done = Object.values(results).filter(Boolean) as RunResult[];
    if (done.length === 0) return null;
    return done.reduce((a, b) => (b.bestValAcc > a.bestValAcc ? b : a));
  }, [results]);

  const activeStrategy = STRATEGIES.find((s) => s.id === strategy)!;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-5">
        {/* Controls */}
        <div>
          <div
            role="radiogroup"
            aria-label="Search strategy"
            className="grid grid-cols-1 gap-2 mb-4"
          >
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={strategy === s.id}
                disabled={running}
                onClick={() => setStrategy(s.id)}
                className={`rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-60 ${
                  strategy === s.id
                    ? "border-[var(--color-accent)]"
                    : "border-[#1e293b] hover:border-[#334155]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#f1f5f9]">
                    {s.name} search
                  </span>
                  {results[s.id] && (
                    <span className="text-[10px] font-mono text-[var(--color-success)]">
                      ✓ best {(results[s.id]!.bestValAcc * 100).toFixed(1)}%
                    </span>
                  )}
                </span>
                <span className="block text-[11px] text-[#94a3b8] leading-relaxed mt-0.5">
                  {s.blurb}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRun}
              disabled={running}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {running
                ? `Trial ${liveTrials.length} of ${BUDGET}...`
                : `Run ${BUDGET} trials`}
            </button>
            <button
              type="button"
              onClick={() => setSeed((s) => s + 1)}
              disabled={running || !activeStrategy.usesSeed}
              className="px-3 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white transition-colors disabled:opacity-40"
            >
              New seed
            </button>
            <span className="text-[10px] font-mono text-[#475569]">
              seed {seed}
              {!activeStrategy.usesSeed && " (grid ignores the seed)"}
            </span>
          </div>

          {bestSoFar && (
            <p className="text-[12px] text-[#94a3b8] mt-3">
              Best so far:{" "}
              <span className="font-mono font-bold text-[var(--color-accent)]">
                {(bestSoFar.cell.valAcc * 100).toFixed(1)}%
              </span>{" "}
              at depth {bestSoFar.cell.depth}, min leaf{" "}
              {bestSoFar.cell.minLeaf}, found on trial {bestSoFar.trial}
            </p>
          )}
          <p role="status" className="sr-only">
            {statusMsg}
          </p>
        </div>

        {/* Trial map */}
        <div>
          <HeatGrid
            view="val"
            markers={markers}
            bestMarkerIndex={bestSoFar?.cell.index}
            showOracleStar
            decorative
          />
          <p className="text-[10px] text-[#475569] mt-2">
            {liveTrials.length > 0
              ? "Numbered chips are the placed trials in evaluation order; the gold chip is the best trial so far. The run result is also announced in the text on the left and in the table below."
              : `Run a search to place ${BUDGET} numbered trial chips on the validation landscape.`}
          </p>
        </div>
      </div>

      {/* Comparison table */}
      <div className="rounded-xl border border-[#1e293b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1e293b] text-left">
                <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                  strategy
                </th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                  trials
                </th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                  best val acc
                </th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                  found on trial
                </th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                  gap to sweep best
                </th>
              </tr>
            </thead>
            <tbody>
              {STRATEGIES.map((s, i) => {
                const r = results[s.id];
                const isYourBest = yourBest && r === yourBest;
                return (
                  <tr
                    key={s.id}
                    style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                  >
                    <td className="px-3 py-2 text-[#f1f5f9] font-semibold">
                      {s.name}
                      {isYourBest && (
                        <span className="ml-2 text-[9px] font-mono text-[var(--color-accent)]">
                          your best
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#94a3b8]">
                      {BUDGET}
                    </td>
                    {r ? (
                      <>
                        <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                          {(r.bestValAcc * 100).toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 font-mono text-[#94a3b8]">
                          {r.bestTrial}
                        </td>
                        <td
                          className={`px-3 py-2 font-mono ${
                            ORACLE.valAcc - r.bestValAcc < 1e-9
                              ? "text-[var(--color-success)]"
                              : "text-[var(--color-warning)]"
                          }`}
                        >
                          {((ORACLE.valAcc - r.bestValAcc) * 100).toFixed(1)}{" "}
                          pts
                        </td>
                      </>
                    ) : (
                      <td
                        colSpan={3}
                        className="px-3 py-2 text-[#475569] italic"
                      >
                        not run yet
                      </td>
                    )}
                  </tr>
                );
              })}
              <tr style={{ background: "#0f172a" }}>
                <td className="px-3 py-2 text-[#94a3b8]">
                  Full sweep (reference)
                </td>
                <td className="px-3 py-2 font-mono text-[#94a3b8]">
                  {N_CELLS}
                </td>
                <td className="px-3 py-2 font-mono text-[var(--color-accent)]">
                  {(ORACLE.valAcc * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 font-mono text-[#94a3b8]">
                  {ORACLE.index + 1}
                </td>
                <td className="px-3 py-2 font-mono text-[var(--color-success)]">
                  0.0 pts
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
        The full sweep row is what evaluating all {N_CELLS} configurations
        would cost and find; your budget buys {BUDGET} of them. Seeded runs
        are deterministic: hit New seed to see how much luck is involved, then
        run the same strategy again.
      </p>
    </div>
  );
}
