"use client";

import React from "react";
import { ROWS, NumKey, NUM_KEYS, isMissing, pearsonPair } from "./data";

interface Props {
  sentinelOn: boolean;
  pair: [NumKey, NumKey];
  onPairChange: (pair: [NumKey, NumKey]) => void;
}

const SW = 320;
const SH = 240;
const PAD = 34;

export default function RelationshipsPanel({ sentinelOn, pair, onPairChange }: Props) {
  const points: { x: number; y: number }[] = [];
  for (const row of ROWS) {
    if (isMissing(row, pair[0], sentinelOn) || isMissing(row, pair[1], sentinelOn)) continue;
    points.push({ x: row[pair[0]] as number, y: row[pair[1]] as number });
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const sx = (v: number) =>
    PAD + ((v - xMin) / (xMax - xMin || 1)) * (SW - PAD - 10);
  const sy = (v: number) =>
    SH - PAD - ((v - yMin) / (yMax - yMin || 1)) * (SH - PAD - 10);

  const selected = pearsonPair(ROWS, pair[0], pair[1], sentinelOn);

  return (
    <div>
      <p className="text-[13px] font-semibold text-white mb-2">
        Step 5: How do the columns move together?
      </p>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        The last standard question: which columns carry related information? The
        matrix below shows the Pearson correlation for every pair of numeric
        columns, computed on rows where both values are present. Click any cell to
        see that pair as a scatter plot. And here the loop bites again: if you have
        not flagged the sentinel in step 2, every correlation involving humidity is
        computed with {`-999`}s mixed in and is close to meaningless.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 overflow-x-auto">
          <p className="text-[11px] text-[#475569] mb-3">
            Pearson correlation (pairwise complete). Click a cell to plot it.
          </p>
          <table className="border-collapse text-[11px] font-mono">
            <thead>
              <tr>
                <th className="p-1"></th>
                {NUM_KEYS.map((k) => (
                  <th key={k} className="p-1 text-[#475569] font-normal text-center">
                    {k.split("_")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NUM_KEYS.map((rowKey) => (
                <tr key={rowKey}>
                  <td className="p-1 text-[#475569] pr-2">{rowKey.split("_")[0]}</td>
                  {NUM_KEYS.map((colKey) => {
                    if (rowKey === colKey) {
                      return (
                        <td key={colKey} className="p-0.5">
                          <div className="w-14 h-10 rounded-md bg-[#1e293b] flex items-center justify-center text-[#475569]">
                            1.00
                          </div>
                        </td>
                      );
                    }
                    const { r } = pearsonPair(ROWS, colKey, rowKey, sentinelOn);
                    const isSel =
                      (pair[0] === colKey && pair[1] === rowKey) ||
                      (pair[0] === rowKey && pair[1] === colKey);
                    const magnitude = Number.isNaN(r) ? 0 : Math.abs(r);
                    const bg = Number.isNaN(r)
                      ? "#1e293b"
                      : r >= 0
                        ? `rgba(59, 180, 164, ${0.12 + 0.55 * magnitude})`
                        : `rgba(239, 68, 68, ${0.12 + 0.55 * magnitude})`;
                    return (
                      <td key={colKey} className="p-0.5">
                        <button
                          onClick={() => onPairChange([colKey, rowKey])}
                          aria-pressed={isSel}
                          aria-label={`Plot ${colKey} against ${rowKey}, correlation ${
                            Number.isNaN(r) ? "undefined" : r.toFixed(2)
                          }`}
                          className="w-14 h-10 rounded-md flex items-center justify-center text-[#f1f5f9] transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                          style={{
                            background: bg,
                            boxShadow: isSel
                              ? "inset 0 0 0 2px var(--color-accent)"
                              : "inset 0 0 0 1px #1e293b",
                          }}
                        >
                          {Number.isNaN(r) ? "n/a" : r.toFixed(2)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[11px] text-[#475569] mb-2">
            <span className="font-mono text-[#94a3b8]">{pair[0]}</span> vs{" "}
            <span className="font-mono text-[#94a3b8]">{pair[1]}</span> · r ={" "}
            {Number.isNaN(selected.r) ? "n/a" : selected.r.toFixed(2)} · n ={" "}
            {selected.n}
          </p>
          <svg
            viewBox={`0 0 ${SW} ${SH}`}
            className="w-full h-auto"
            role="img"
            aria-label={`Scatter plot of ${pair[1]} against ${pair[0]} with ${
              selected.n
            } points and Pearson correlation ${
              Number.isNaN(selected.r) ? "undefined" : selected.r.toFixed(2)
            }.`}
          >
            <line x1={PAD} y1={SH - PAD} x2={SW - 6} y2={SH - PAD} stroke="#334155" strokeWidth={1} />
            <line x1={PAD} y1={8} x2={PAD} y2={SH - PAD} stroke="#334155" strokeWidth={1} />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={3}
                fill="#3bb4a4"
                fillOpacity={0.55}
              />
            ))}
            <text x={PAD} y={SH - PAD + 14} fontSize={8} fill="#475569" fontFamily="monospace">
              {xMin.toFixed(1)}
            </text>
            <text x={SW - 6} y={SH - PAD + 14} fontSize={8} fill="#475569" fontFamily="monospace" textAnchor="end">
              {xMax.toFixed(1)}
            </text>
            <text x={PAD - 4} y={SH - PAD} fontSize={8} fill="#475569" fontFamily="monospace" textAnchor="end">
              {yMin.toFixed(1)}
            </text>
            <text x={PAD - 4} y={14} fontSize={8} fill="#475569" fontFamily="monospace" textAnchor="end">
              {yMax.toFixed(1)}
            </text>
          </svg>
          <p className="text-[11px] text-[#475569] leading-relaxed mt-2">
            {sentinelOn ? (
              <>
                With sentinels excluded, look at temp against battery: warmer air,
                faster battery drain. A relationship like that is a lead for the
                next question in the loop, not a conclusion.
              </>
            ) : (
              <>
                Any pair involving humidity currently includes the {`-999`} codes,
                which drag the correlation and crush the scatter into a corner. Fix
                step 2 first, then come back and re-read this matrix.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
