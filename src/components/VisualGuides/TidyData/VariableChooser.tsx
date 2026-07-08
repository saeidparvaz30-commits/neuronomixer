"use client";

import React from "react";
import { EX_COLS, EX_ROWS, type Choice, type ExerciseResult } from "./types";

type Props = {
  choice: Record<string, Choice>;
  onChoose: (key: string, c: Choice) => void;
  result: ExerciseResult | null;
  hasPivoted: boolean;
  onPivot: () => void;
};

const TH = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]";
const TD = "px-3 py-2 text-[12px] text-[#94a3b8]";

/**
 * Choose-the-variables exercise: the learner marks each column as an
 * identifier or as values to melt, pivots, and gets a computed tidiness
 * verdict (see runExercisePivot in types.ts).
 */
export default function VariableChooser({ choice, onChoose, result, hasPivoted, onPivot }: Props) {
  return (
    <div>
      {/* Source table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse" aria-label="Blood pressure diary in wide form">
          <thead>
            <tr className="bg-[#1e293b]">
              {EX_COLS.map((c) => (
                <th scope="col" key={c.key} className={TH}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EX_ROWS.map((row, i) => (
              <tr key={String(row.patient)} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                {EX_COLS.map((c) => (
                  <td key={c.key} className={`${TD} font-mono`}>
                    {row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-[#475569] mt-2">
          Illustrative diary: {EX_ROWS.length} patients, systolic blood pressure (mmHg) recorded
          for three weeks, plus each patient&apos;s weight.
        </p>
      </div>

      {/* Column role pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
        {EX_COLS.map((c) => {
          const current = choice[c.key];
          return (
            <div key={c.key} className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-2.5">
              <p className="text-[11px] font-mono font-semibold text-[#f1f5f9] mb-2">{c.label}</p>
              <div
                role="radiogroup"
                aria-label={`Role of column ${c.label}`}
                className="flex flex-col gap-1"
              >
                <button
                  role="radio"
                  aria-checked={current === "id"}
                  onClick={() => onChoose(c.key, "id")}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    current === "id"
                      ? "bg-[#1e293b] text-white border border-[#334155]"
                      : "text-[#475569] hover:text-[#94a3b8] border border-transparent"
                  }`}
                >
                  Identifier (keep)
                </button>
                <button
                  role="radio"
                  aria-checked={current === "melt"}
                  onClick={() => onChoose(c.key, "melt")}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    current === "melt"
                      ? "bg-[var(--color-accent)] text-[#0a0e1a] border border-transparent"
                      : "text-[#475569] hover:text-[#94a3b8] border border-transparent"
                  }`}
                >
                  Values (melt)
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onPivot}
        className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Pivot with this choice
      </button>

      {/* Verdict + result */}
      {hasPivoted && result === null && (
        <p className="mt-4 text-[12px] text-[var(--color-warning)]">
          Nothing to pivot: mark at least one column as &quot;Values (melt)&quot; first.
        </p>
      )}

      {result && (
        <div className="mt-4" aria-live="polite">
          <div
            className={`rounded-xl border p-4 mb-4 ${
              result.isTidy
                ? "border-[var(--color-success)]/40 bg-[#0f172a]"
                : "border-[var(--color-warning)]/40 bg-[#0f172a]"
            }`}
          >
            <p
              className="text-[13px] font-bold mb-1.5"
              style={{ color: result.isTidy ? "var(--color-success)" : "var(--color-warning)" }}
            >
              {result.isTidy ? "Tidy: one observation per row" : "Not tidy yet"}
            </p>
            <ul className="text-[12px] text-[#94a3b8] leading-relaxed space-y-1 list-disc list-inside">
              <li>
                Produced {result.rows.length} rows ({EX_ROWS.length} patients x{" "}
                {result.meltColKeys.length} melted column{result.meltColKeys.length === 1 ? "" : "s"}
                ).
              </li>
              {result.meltedIdCols.length > 0 && (
                <li>
                  You melted identifier column{result.meltedIdCols.length === 1 ? "" : "s"}{" "}
                  <span className="font-mono text-[var(--color-warning)]">
                    {result.meltedIdCols.join(", ")}
                  </span>
                  : the value column now mixes {result.unitsInValueColumn.join(" with ")}, so a
                  single row no longer holds one measurement of one thing.
                </li>
              )}
              {result.leftBehindValueCols.length > 0 && (
                <li>
                  <span className="font-mono text-[var(--color-warning)]">
                    {result.leftBehindValueCols.join(", ")}
                  </span>{" "}
                  stayed as header{result.leftBehindValueCols.length === 1 ? "" : "s"}: the week
                  variable is still trapped in column names instead of living in a column of its
                  own.
                </li>
              )}
              {result.isTidy && (
                <li>
                  Every row is (patient, weight_kg, measurement, value): one blood pressure
                  reading per row, all in mmHg, with the week recoverable from the measurement
                  label. Variables are columns, observations are rows, values are cells.
                </li>
              )}
            </ul>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse" aria-label="Result of your pivot">
              <thead>
                <tr className="bg-[#1e293b]">
                  {result.idColKeys.map((k) => (
                    <th scope="col" key={k} className={TH}>
                      {k}
                    </th>
                  ))}
                  <th scope="col" className={TH}>
                    measurement
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    value
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                    {r.ids.map((id) => (
                      <td key={id.key} className={`${TD} font-mono`}>
                        {id.value}
                      </td>
                    ))}
                    <td className={`${TD} font-mono`}>{r.measurement}</td>
                    <td className={`${TD} font-mono text-right text-[#f1f5f9]`}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
