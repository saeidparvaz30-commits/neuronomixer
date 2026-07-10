"use client";

import React from "react";
import {
  Workload,
  Prices,
  computeRequestCost,
  formatUSD,
  formatInt,
  formatPct,
  MONTH_DAYS,
  CATEGORY_ACCENT,
} from "./costMath";
import { LabeledSlider, PriceField } from "./Controls";

type Props = {
  workload: Workload;
  prices: Prices;
  onWorkloadChange: (field: keyof Workload, value: number) => void;
  onPriceChange: (field: keyof Prices, value: number) => void;
};

export default function CostCalculator({
  workload,
  prices,
  onWorkloadChange,
  onPriceChange,
}: Props) {
  const cost = computeRequestCost(workload, prices);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <LabeledSlider
          id="calc-prompt"
          label="Prompt tokens per request"
          value={workload.promptTokens}
          min={100}
          max={100000}
          step={100}
          onChange={(v) => onWorkloadChange("promptTokens", v)}
          format={formatInt}
        />
        <LabeledSlider
          id="calc-output"
          label="Output tokens per request"
          value={workload.outputTokens}
          min={10}
          max={4000}
          step={10}
          onChange={(v) => onWorkloadChange("outputTokens", v)}
          format={formatInt}
        />
        <LabeledSlider
          id="calc-requests"
          label="Requests per day"
          value={workload.requestsPerDay}
          min={100}
          max={50000}
          step={100}
          onChange={(v) => onWorkloadChange("requestsPerDay", v)}
          format={formatInt}
        />

        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[#f1f5f9] mb-1">
            Editable price assumptions
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed mb-3">
            Defaults are illustrative placeholders as of July 2026, not any
            vendor&apos;s price list. Type in your provider&apos;s real rates and
            everything on this page recomputes.
          </p>
          <div className="flex flex-wrap gap-5">
            <PriceField
              id="price-in"
              label="Input price per million tokens"
              value={prices.inPerMTok}
              onChange={(v) => onPriceChange("inPerMTok", v)}
            />
            <PriceField
              id="price-out"
              label="Output price per million tokens"
              value={prices.outPerMTok}
              onChange={(v) => onPriceChange("outPerMTok", v)}
            />
          </div>
        </div>
      </div>

      {/* Readouts */}
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
            Cost of one request
          </p>
          <p className="text-3xl font-black font-mono text-[#f1f5f9] mb-3">
            {formatUSD(cost.perRequest)}
          </p>
          <div
            className="h-3 rounded-full overflow-hidden flex bg-[#1e293b]"
            role="img"
            aria-label={`Input cost ${formatUSD(cost.inputCost)}, ${formatPct(
              cost.inputShare
            )} of the request. Output cost ${formatUSD(cost.outputCost)}.`}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${cost.inputShare * 100}%`,
                background: CATEGORY_ACCENT,
              }}
            />
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(1 - cost.inputShare) * 100}%`,
                background: "#1e5d8a",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px]">
            <span style={{ color: CATEGORY_ACCENT }}>
              input {formatUSD(cost.inputCost)} ({formatPct(cost.inputShare)})
            </span>
            <span className="text-[#93c5fd]">
              output {formatUSD(cost.outputCost)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#1e293b] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Per day
            </p>
            <p className="text-2xl font-black font-mono text-[#f1f5f9]">
              {formatUSD(cost.perDay)}
            </p>
            <p className="text-[10px] text-[#475569] mt-1">
              {formatInt(workload.requestsPerDay)} requests
            </p>
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: `${CATEGORY_ACCENT}66` }}>
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Per month ({MONTH_DAYS} days)
            </p>
            <p
              className="text-2xl font-black font-mono"
              style={{ color: CATEGORY_ACCENT }}
            >
              {formatUSD(cost.perMonth)}
            </p>
            <p className="text-[10px] text-[#475569] mt-1">
              {formatInt(workload.requestsPerDay * MONTH_DAYS)} requests
            </p>
          </div>
        </div>

        <p className="text-[11px] text-[#475569] leading-relaxed">
          With these numbers the prompt is {formatPct(cost.inputShare)} of every
          request&apos;s bill, even though each output token costs more than each
          input token. The reason: you resend the whole prompt on every call.
          That resent share is exactly what prompt caching (last section) attacks.
        </p>
      </div>
    </div>
  );
}
