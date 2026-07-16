"use client";

import React from "react";
import {
  CLEAN_REVENUE,
  formatMoney,
  revenueForDay,
  RowVerdict,
} from "./types";

interface Props {
  /** Rows that passed the gate, for days whose batch has finished loading. */
  loaded: readonly RowVerdict[];
  /** Days whose batch has reached the warehouse so far this run. */
  loadedDays: readonly number[];
}

const DAYS = [1, 2, 3] as const;

const W = 360;
const H = 190;
const PAD_L = 52;
const PAD_B = 26;
const PAD_T = 14;
const PLOT_W = W - PAD_L - 10;
const PLOT_H = H - PAD_T - PAD_B;

/**
 * The dashboard at the end of the pipeline: daily revenue as the sum of
 * loaded amounts. Every bar, tick, and deviation note is computed from the
 * rows that actually reached the warehouse this run. If a text amount got
 * through, the sum is genuinely NaN; if a fat-fingered amount got through,
 * the axis genuinely explodes.
 */
export default function RevenueChart({ loaded, loadedDays }: Props) {
  const sums = DAYS.map((d) => ({
    day: d,
    isLoaded: loadedDays.includes(d),
    sum: revenueForDay(loaded, d),
    ref: CLEAN_REVENUE[d],
  }));

  const finiteValues = [
    ...sums.filter((s) => s.isLoaded && Number.isFinite(s.sum)).map((s) => s.sum),
    ...sums.map((s) => s.ref),
  ];
  const yMax = Math.max(...finiteValues, 1) * 1.08;

  const yFor = (v: number) => PAD_T + PLOT_H - (v / yMax) * PLOT_H;
  const slotW = PLOT_W / DAYS.length;
  const barW = slotW * 0.42;

  const anyNaN = sums.some((s) => s.isLoaded && Number.isNaN(s.sum));
  const ticks = [0, 0.5, 1].map((f) => yMax * f);

  const summary = sums
    .map((s) =>
      s.isLoaded
        ? `Day ${s.day} revenue ${formatMoney(s.sum)}, defect-free value ${formatMoney(s.ref)}.`
        : `Day ${s.day} not loaded yet.`
    )
    .join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Daily revenue bar chart computed from the warehouse. ${summary}`}
      >
        {/* Axis + gridlines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={W - 10}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 6}
              y={yFor(t) + 3}
              textAnchor="end"
              fontSize={8}
              fill="#475569"
              fontFamily="monospace"
            >
              {`$${Math.round(t).toLocaleString("en-US")}`}
            </text>
          </g>
        ))}

        {sums.map((s, i) => {
          const cx = PAD_L + slotW * i + slotW / 2;
          const x = cx - barW / 2;
          const broken = s.isLoaded && Number.isNaN(s.sum);
          const barH = s.isLoaded && Number.isFinite(s.sum)
            ? Math.max(1.5, (s.sum / yMax) * PLOT_H)
            : 0;
          const off = Math.abs(s.sum - s.ref) > 0.005;

          return (
            <g key={s.day}>
              {/* Reference marker: revenue if every defect were quarantined */}
              <line
                x1={cx - barW * 0.75}
                x2={cx + barW * 0.75}
                y1={yFor(s.ref)}
                y2={yFor(s.ref)}
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />

              {!s.isLoaded ? (
                <rect
                  x={x}
                  y={PAD_T}
                  width={barW}
                  height={PLOT_H}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  rx={3}
                />
              ) : broken ? (
                <>
                  <rect
                    x={x}
                    y={PAD_T}
                    width={barW}
                    height={PLOT_H}
                    fill="#ef4444"
                    opacity={0.12}
                    rx={3}
                  />
                  <rect
                    x={x}
                    y={PAD_T}
                    width={barW}
                    height={PLOT_H}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    rx={3}
                  />
                  <text
                    x={cx}
                    y={PAD_T + PLOT_H / 2}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill="#ef4444"
                    fontFamily="monospace"
                  >
                    NaN
                  </text>
                </>
              ) : (
                <>
                  <rect
                    x={x}
                    y={yFor(s.sum)}
                    width={barW}
                    height={barH}
                    fill={off ? "var(--color-warning)" : "#1e5d8a"}
                    rx={3}
                    style={{ transition: "height 0.4s, y 0.4s" }}
                  />
                  <text
                    x={cx}
                    y={yFor(s.sum) - 4}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight={700}
                    fill={off ? "var(--color-warning)" : "#94a3b8"}
                    fontFamily="monospace"
                  >
                    {formatMoney(s.sum)}
                  </text>
                </>
              )}

              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
                fontFamily="monospace"
              >
                Day {s.day}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
        <span className="text-[var(--color-accent)]">Dashed gold line</span>:
        revenue from contract-valid rows only, the number this chart should
        show. Bars turn <span className="text-[var(--color-warning)]">orange</span>{" "}
        when they drift from it.
      </p>

      {/* Computed diagnosis of whatever the escaped rows did */}
      <ul className="mt-2 flex flex-col gap-1">
        {sums
          .filter((s) => s.isLoaded)
          .map((s) => {
            if (Number.isNaN(s.sum)) {
              return (
                <li key={s.day} className="text-[11px] text-[#ef4444] leading-relaxed">
                  Day {s.day}: NaN. A non-numeric amount reached the SUM and
                  poisoned the whole total. The dashboard for this day is dead.
                </li>
              );
            }
            const diff = s.sum - s.ref;
            if (Math.abs(diff) > 0.005) {
              return (
                <li key={s.day} className="text-[11px] text-[var(--color-warning)] leading-relaxed">
                  Day {s.day}: {formatMoney(s.sum)}, which is{" "}
                  {formatMoney(Math.abs(diff))} {diff > 0 ? "above" : "below"} the
                  defect-free value of {formatMoney(s.ref)}.
                </li>
              );
            }
            return (
              <li key={s.day} className="text-[11px] text-[var(--color-success)] leading-relaxed">
                Day {s.day}: {formatMoney(s.sum)}, exactly the defect-free value.
              </li>
            );
          })}
        {anyNaN && (
          <li className="text-[10px] text-[#475569] leading-relaxed">
            Note the axis: it is scaled from the finite values only, because
            NaN cannot even be plotted.
          </li>
        )}
      </ul>
    </div>
  );
}
