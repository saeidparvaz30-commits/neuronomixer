"use client";

import React from "react";
import { OUTCOME_COLORS, Strictness, STRICTNESS_META } from "./types";
import { analyticValidRate, analyticValidWrongRate } from "./simulation";
import {
  buildAttemptTable,
  expectedAttemptsPerValid,
  expectedCostPerValid,
  expectedRetriesPerValid,
  formatCount,
  formatPct,
  formatUsd,
} from "./economics";

export interface EconomicsSnapshot {
  errorRatePct: number;
  expectedAttempts: number;
  costPerValidUnconstrained: number;
  costPerValidConstrained: number;
}

type Props = {
  errorRatePct: number;
  strictness: Strictness;
  priceText: string;
  onPriceChange: (text: string) => void;
  gatesReady: boolean;
  acked: boolean;
  onAck: (snapshot: EconomicsSnapshot) => void;
};

export default function RetryEconomics({
  errorRatePct,
  strictness,
  priceText,
  onPriceChange,
  gatesReady,
  acked,
  onAck,
}: Props) {
  const e = errorRatePct / 100;
  const pUnc = analyticValidRate(e, strictness, false);
  const wrongConstrained = analyticValidWrongRate(e, strictness, true);

  const price = Number.parseFloat(priceText);
  const priceValid = Number.isFinite(price) && price > 0;
  const safePrice = priceValid ? price : 0;

  const attemptsUnc = expectedAttemptsPerValid(pUnc);
  const retriesUnc = expectedRetriesPerValid(pUnc);
  const costUnc = expectedCostPerValid(pUnc, safePrice);
  const rows = buildAttemptTable(pUnc, safePrice, 6);

  const pCon = analyticValidRate(e, strictness, true);
  const attemptsCon = expectedAttemptsPerValid(pCon);
  const retriesCon = expectedRetriesPerValid(pCon);
  const costCon = expectedCostPerValid(pCon, safePrice);

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        A schema-invalid output is at least detectable: the parser rejects it and you
        retry. Attempts to the first valid output follow a geometric distribution, so
        the expected attempt count is 1 / p where p is the valid rate at your current
        settings. Multiply by your price per call and the retry bill is exact.
      </p>

      {/* Price input */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label htmlFor="sor-price" className="text-[12px] font-semibold text-white">
          Price per API call (USD)
        </label>
        <input
          id="sor-price"
          type="number"
          min={0}
          step={0.001}
          inputMode="decimal"
          value={priceText}
          onChange={(ev) => onPriceChange(ev.target.value)}
          className="w-28 rounded-lg border border-[#334155] bg-[#1e293b] px-3 py-2 font-mono text-sm text-[#f1f5f9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
        <span className="text-[11px] text-[#475569]">
          editable; the 0.01 default is a placeholder, set your model&apos;s real
          per-call cost
        </span>
      </div>
      {!priceValid && (
        <p className="text-[11px] mb-4" style={{ color: OUTCOME_COLORS.invalid }}>
          Enter a price greater than zero to compute costs.
        </p>
      )}

      {/* Unconstrained vs constrained comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-[var(--color-warning)]/40 p-4">
          <p className="text-[11px] font-semibold text-[var(--color-warning)] mb-2 uppercase tracking-wide">
            Unconstrained at {errorRatePct}% error, {STRICTNESS_META[strictness].label}
          </p>
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-[12px] text-[#94a3b8]">Valid rate p</dt>
              <dd className="text-[12px] font-mono font-bold text-[#f1f5f9]">
                {formatPct(pUnc, 2)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[12px] text-[#94a3b8]">Expected attempts (1 / p)</dt>
              <dd className="text-[12px] font-mono font-bold text-[var(--color-warning)]">
                {formatCount(attemptsUnc)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[12px] text-[#94a3b8]">Expected retries</dt>
              <dd className="text-[12px] font-mono font-bold text-[var(--color-warning)]">
                {formatCount(retriesUnc)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[12px] text-[#94a3b8]">Expected cost per valid output</dt>
              <dd className="text-[12px] font-mono font-bold text-[var(--color-warning)]">
                {priceValid ? formatUsd(costUnc) : "?"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-[var(--color-success)]/40 p-4">
          <p className="text-[11px] font-semibold text-[var(--color-success)] mb-2 uppercase tracking-wide">
            Constrained at the same settings
          </p>
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-[12px] text-[#94a3b8]">Valid rate p</dt>
              <dd className="text-[12px] font-mono font-bold text-[#f1f5f9]">
                {formatPct(pCon, 2)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[12px] text-[#94a3b8]">Expected attempts (1 / p)</dt>
              <dd className="text-[12px] font-mono font-bold text-[var(--color-success)]">
                {formatCount(attemptsCon)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[12px] text-[#94a3b8]">Expected retries</dt>
              <dd className="text-[12px] font-mono font-bold text-[var(--color-success)]">
                {formatCount(retriesCon)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[12px] text-[#94a3b8]">Expected cost per valid output</dt>
              <dd className="text-[12px] font-mono font-bold text-[var(--color-success)]">
                {priceValid ? formatUsd(costCon) : "?"}
              </dd>
            </div>
          </dl>
          <p className="text-[10px] text-[#475569] leading-relaxed mt-2">
            The mask guarantees every emission parses, so one call is one valid output.
            Masking itself adds some inference overhead per token; how it works under
            the hood is its own topic.
          </p>
        </div>
      </div>

      {/* Retry table */}
      <div className="rounded-xl border border-[#1e293b] overflow-hidden mb-4">
        <div className="px-4 py-2.5 bg-[#1e293b]">
          <p className="text-[12px] font-semibold text-white">
            Retry table, unconstrained: P(first success at attempt k) = (1 - p)^(k-1) · p
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1e293b] text-left">
                <th className="px-4 py-2 font-semibold text-[#94a3b8]">Attempt k</th>
                <th className="px-4 py-2 font-semibold text-[#94a3b8]">
                  First success exactly here
                </th>
                <th className="px-4 py-2 font-semibold text-[#94a3b8]">
                  Valid output by attempt k
                </th>
                <th className="px-4 py-2 font-semibold text-[#94a3b8]">Spend by k</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.k} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                  <td className="px-4 py-2 font-mono text-[#f1f5f9]">{row.k}</td>
                  <td className="px-4 py-2 font-mono text-[#94a3b8]">
                    {formatPct(row.firstSuccessProb, 2)}
                  </td>
                  <td className="px-4 py-2 font-mono text-[#f1f5f9]">
                    {formatPct(row.cumulativeSuccessProb, 2)}
                  </td>
                  <td className="px-4 py-2 font-mono text-[#94a3b8]">
                    {priceValid ? formatUsd(row.spend) : "?"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* The failure retries cannot see */}
      <div
        className="rounded-xl border p-4 mb-4"
        style={{ borderColor: `${OUTCOME_COLORS.validWrong}66` }}
      >
        <p
          className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide"
          style={{ color: OUTCOME_COLORS.validWrong }}
        >
          The failure no retry loop can see
        </p>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          At {errorRatePct}% error with {STRICTNESS_META[strictness].label.toLowerCase()}{" "}
          strictness, constrained decoding still yields{" "}
          <span className="font-mono font-bold" style={{ color: OUTCOME_COLORS.validWrong }}>
            {formatPct(wrongConstrained, 2)}
          </span>{" "}
          valid-but-wrong outputs: perfectly parseable JSON that calls for the wrong
          city or the wrong units. The parser says yes, the schema says yes, and only an
          evaluation of the content catches it. Tighter enums shrink this class; only
          evals close it.
        </p>
      </div>

      <button
        onClick={() =>
          onAck({
            errorRatePct,
            expectedAttempts: attemptsUnc,
            costPerValidUnconstrained: costUnc,
            costPerValidConstrained: costCon,
          })
        }
        disabled={!gatesReady || !priceValid || acked}
        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
          acked
            ? "border-[var(--color-success)]/50 text-[var(--color-success)] cursor-default"
            : !gatesReady || !priceValid
              ? "border-[#1e293b] text-[#475569] cursor-not-allowed"
              : "border-[var(--color-warning)]/60 text-[var(--color-warning)] hover:border-[var(--color-warning)]"
        }`}
      >
        {acked
          ? "Retry economics understood"
          : !gatesReady
            ? "Run both batch comparisons first"
            : !priceValid
              ? "Enter a valid price first"
              : "I compared the columns and read the retry costs"}
      </button>
    </div>
  );
}
