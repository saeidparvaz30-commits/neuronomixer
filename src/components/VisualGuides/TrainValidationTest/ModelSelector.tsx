"use client";

import React from "react";
import { DegreeResult, DEGREES, bestBy, N_FRESH, N_SAMPLES } from "./splitMath";
import { TRAIN_COLOR, VAL_COLOR, TEST_COLOR } from "./SplitStrip";

interface Props {
  results: DegreeResult[];
  b1: number;
  b2: number;
  degree: number;
  peek: boolean;
  revealed: boolean;
  onAdoptDegree: (d: number) => void;
  onTogglePeek: () => void;
  onReveal: () => void;
}

const W = 640;
const H = 300;
const ML = 64;
const MR = 14;
const MT = 14;
const MB = 46;

/**
 * Degree-vs-RMSE curves with the peek-at-test toggle and the fresh-data
 * reveal. Selection markers and every number come from splitMath results.
 */
export default function ModelSelector({
  results,
  b1,
  b2,
  degree,
  peek,
  revealed,
  onAdoptDegree,
  onTogglePeek,
  onReveal,
}: Props) {
  const byVal = bestBy(results, "valRmse");
  const byTest = bestBy(results, "testRmse");

  const displayed: number[] = [];
  for (const r of results) {
    displayed.push(r.trainRmse, r.valRmse);
    if (peek) displayed.push(r.testRmse);
  }
  const rawMax = Math.max(...displayed);
  const clipped = rawMax > 1.2;
  const yMax = clipped ? 1.2 : rawMax * 1.08;

  const dMin = DEGREES[0];
  const dMax = DEGREES[DEGREES.length - 1];

  const sx = (d: number): string =>
    (ML + ((d - dMin) / (dMax - dMin)) * (W - ML - MR)).toFixed(2);
  const sy = (v: number): string => {
    const c = Math.min(v, yMax);
    return (MT + (1 - c / yMax) * (H - MT - MB)).toFixed(2);
  };

  const series = [
    {
      key: "trainRmse" as const,
      color: TRAIN_COLOR,
      label: "train",
      shape: "circle",
    },
    {
      key: "valRmse" as const,
      color: VAL_COLOR,
      label: "validation",
      shape: "diamond",
    },
    ...(peek
      ? [
          {
            key: "testRmse" as const,
            color: TEST_COLOR,
            label: "test (peeking!)",
            shape: "square",
          },
        ]
      : []),
  ];

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);

  const honestGapPct =
    (100 * (byVal.freshRmse - byVal.testRmse)) / byVal.freshRmse;
  const peekGapPct =
    (100 * (byTest.freshRmse - byTest.testRmse)) / byTest.freshRmse;
  const samePick = byVal.degree === byTest.degree;

  const smallSplits = [
    { name: "train", n: b1 },
    { name: "validation", n: b2 - b1 },
    { name: "test", n: N_SAMPLES - b2 },
  ]
    .filter((s) => s.n < 15)
    .map((s) => `${s.name} n=${s.n}`)
    .join(", ");

  return (
    <div>
      {/* Peek control */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={onTogglePeek}
          aria-pressed={peek}
          className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
            peek
              ? "border-[var(--color-warning)] text-[var(--color-warning)] bg-[#f97316]/10"
              : "border-[#1e293b] text-[#f1f5f9] hover:border-[#334155]"
          }`}
        >
          {peek ? "Peeking at test errors" : "Peek at the test errors"}
        </button>
        {peek && (
          <>
            <button
              onClick={() => onAdoptDegree(byTest.degree)}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-[#f1f5f9] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Adopt the test winner: degree {byTest.degree}
            </button>
            <button
              onClick={onReveal}
              disabled={revealed}
              className={`px-4 py-2 rounded-xl text-[12px] font-semibold transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                revealed
                  ? "bg-[#1e293b] text-[#475569] cursor-default"
                  : "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
              }`}
            >
              {revealed ? "Penalty revealed below" : "Reveal the honest penalty"}
            </button>
          </>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto rounded-xl border border-[#1e293b] bg-[#0f172a]"
        role="img"
        aria-label={`RMSE by polynomial degree. Best degree by validation: ${byVal.degree} with validation RMSE ${byVal.valRmse.toFixed(3)}.${peek ? ` Best degree by test: ${byTest.degree} with test RMSE ${byTest.testRmse.toFixed(3)}.` : " Test curve hidden until you peek."}`}
      >
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={ML}
              x2={W - MR}
              y1={sy(t)}
              y2={sy(t)}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={ML - 6}
              y={sy(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="20"
              fill="#475569"
            >
              {t.toFixed(2)}
            </text>
          </g>
        ))}
        {DEGREES.map((d) => (
          <text
            key={`x${d}`}
            x={sx(d)}
            y={H - 28}
            textAnchor="middle"
            fontSize="20"
            fill={d === degree ? "#f1f5f9" : "#475569"}
            fontWeight={d === degree ? 700 : 400}
          >
            {d}
          </text>
        ))}
        <text
          x={(ML + (W - MR)) / 2}
          y={H - 2}
          textAnchor="middle"
          fontSize="20"
          fill="#475569"
        >
          polynomial degree
        </text>

        {/* current degree marker */}
        <line
          x1={sx(degree)}
          x2={sx(degree)}
          y1={MT}
          y2={H - MB}
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {series.map((s) => (
          <g key={s.key}>
            <polyline
              points={results
                .map((r) => `${sx(r.degree)},${sy(r[s.key])}`)
                .join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
            />
            {results.map((r) => {
              const v = r[s.key];
              const isClipped = v > yMax;
              const cx = sx(r.degree);
              const cy = sy(v);
              if (isClipped) {
                return (
                  <path
                    key={`${s.key}${r.degree}`}
                    d={`M${cx},${(Number(cy) + 1).toFixed(2)} l-4.5,7 l9,0 Z`}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="1.5"
                  />
                );
              }
              if (s.shape === "circle")
                return (
                  <circle
                    key={`${s.key}${r.degree}`}
                    cx={cx}
                    cy={cy}
                    r="3.2"
                    fill={s.color}
                  />
                );
              if (s.shape === "diamond")
                return (
                  <path
                    key={`${s.key}${r.degree}`}
                    d={`M${cx},${(Number(cy) - 4.2).toFixed(2)} l4.2,4.2 l-4.2,4.2 l-4.2,-4.2 Z`}
                    fill={s.color}
                  />
                );
              return (
                <rect
                  key={`${s.key}${r.degree}`}
                  x={(Number(cx) - 3).toFixed(2)}
                  y={(Number(cy) - 3).toFixed(2)}
                  width="6"
                  height="6"
                  fill={s.color}
                />
              );
            })}
          </g>
        ))}

        {/* val pick marker */}
        <circle
          cx={sx(byVal.degree)}
          cy={sy(byVal.valRmse)}
          r="7.5"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.75"
        />
        <text
          x={sx(byVal.degree)}
          y={(Number(sy(byVal.valRmse)) - 14).toFixed(2)}
          textAnchor="middle"
          fontSize="20"
          fontWeight={700}
          fill="var(--color-accent)"
        >
          val pick: {byVal.degree}
        </text>

        {peek && (
          <>
            <circle
              cx={sx(byTest.degree)}
              cy={sy(byTest.testRmse)}
              r="7.5"
              fill="none"
              stroke="var(--color-warning)"
              strokeWidth="1.75"
            />
            <text
              x={sx(byTest.degree)}
              y={(Number(sy(byTest.testRmse)) + 28).toFixed(2)}
              textAnchor="middle"
              fontSize="20"
              fontWeight={700}
              fill="var(--color-warning)"
            >
              test pick: {byTest.degree}
            </text>
          </>
        )}
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-[#94a3b8]">
        <span className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <circle cx="5" cy="5" r="4" fill={TRAIN_COLOR} />
          </svg>
          train RMSE
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M5 0 L10 5 L5 10 L0 5 Z" fill={VAL_COLOR} />
          </svg>
          validation RMSE
        </span>
        {peek ? (
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect x="1" y="1" width="8" height="8" fill={TEST_COLOR} />
            </svg>
            test RMSE (you are peeking)
          </span>
        ) : (
          <span className="text-[#475569]">test RMSE hidden until you peek</span>
        )}
        {clipped && (
          <span className="text-[var(--color-warning)]">
            values above {yMax.toFixed(2)} clipped (open triangles)
          </span>
        )}
      </div>

      {/* Reveal panel */}
      {peek && revealed && (
        <div className="mt-5">
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3 max-w-[720px]">
            Judge both selection rules on {N_FRESH.toLocaleString()} fresh
            samples from the same generator. Fresh data was never used to fit
            or to choose anything, so it plays the role of production traffic.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-2">
                Honest: choose on validation
              </p>
              <div className="space-y-1.5 text-[12px]">
                <p className="text-[#94a3b8]">
                  Picked degree{" "}
                  <span className="font-mono font-bold text-[#f1f5f9]">
                    {byVal.degree}
                  </span>{" "}
                  (lowest validation RMSE {byVal.valRmse.toFixed(3)})
                </p>
                <p className="text-[#94a3b8]">
                  Reported test RMSE:{" "}
                  <span className="font-mono font-bold text-[#f1f5f9]">
                    {byVal.testRmse.toFixed(3)}
                  </span>
                </p>
                <p className="text-[#94a3b8]">
                  Fresh-data RMSE:{" "}
                  <span className="font-mono font-bold text-[#f1f5f9]">
                    {byVal.freshRmse.toFixed(3)}
                  </span>
                </p>
                <p
                  className={
                    Math.abs(honestGapPct) < 10
                      ? "text-[var(--color-success)]"
                      : "text-[#94a3b8]"
                  }
                >
                  Estimate off by {Math.abs(honestGapPct).toFixed(1)}%
                  {Math.abs(honestGapPct) < 10
                    ? ", an honest read"
                    : smallSplits
                      ? ` (small splits give noisy estimates: ${smallSplits})`
                      : " (the estimate is unbiased but still noisy at these sample sizes)"}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--color-warning)]/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-warning)] mb-2">
                Peeked: choose on test
              </p>
              <div className="space-y-1.5 text-[12px]">
                <p className="text-[#94a3b8]">
                  Picked degree{" "}
                  <span className="font-mono font-bold text-[#f1f5f9]">
                    {byTest.degree}
                  </span>{" "}
                  (lowest test RMSE across all {results.length} models)
                </p>
                <p className="text-[#94a3b8]">
                  Reported test RMSE:{" "}
                  <span className="font-mono font-bold text-[#f1f5f9]">
                    {byTest.testRmse.toFixed(3)}
                  </span>
                </p>
                <p className="text-[#94a3b8]">
                  Fresh-data RMSE:{" "}
                  <span className="font-mono font-bold text-[#f1f5f9]">
                    {byTest.freshRmse.toFixed(3)}
                  </span>
                </p>
                {peekGapPct > 0 ? (
                  <p className="text-[var(--color-warning)]">
                    The reported number was {peekGapPct.toFixed(1)}% too rosy:
                    that gap is selection overfitting.
                  </p>
                ) : (
                  <p className="text-[#94a3b8]">
                    With this particular split the peeked number happened not
                    to flatter itself. That is luck, not honesty: drag the
                    boundaries and reveal again.
                  </p>
                )}
              </div>
            </div>
          </div>
          {samePick ? (
            <p className="text-[11px] text-[#475569] leading-relaxed mt-3 max-w-[720px]">
              Here both rules landed on the same degree, so the damage is
              limited to the reporting: quoting the minimum of many test
              errors as your final number still overstates how good the model
              is. Shrink the test set with the strip above and the two picks
              will usually diverge.
            </p>
          ) : byTest.freshRmse > byVal.freshRmse ? (
            <p className="text-[11px] text-[#475569] leading-relaxed mt-3 max-w-[720px]">
              The peeked pick is not just overreported, it is genuinely worse
              on fresh data ({byTest.freshRmse.toFixed(3)} vs{" "}
              {byVal.freshRmse.toFixed(3)}). Choosing on test optimized for
              the noise in those few held-out points, not for the signal.
            </p>
          ) : (
            <p className="text-[11px] text-[#475569] leading-relaxed mt-3 max-w-[720px]">
              On this split the peeked pick happens to survive on fresh data,
              but its reported score was still not trustworthy. The bias is in
              the procedure, not in any single lucky outcome.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
