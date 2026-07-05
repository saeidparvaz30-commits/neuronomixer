"use client";

import React from "react";
import Link from "next/link";

export default function ComparisonPanel() {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <p className="text-[13px] font-semibold text-white mb-1">
        Same question, with and without tools
      </p>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[640px]">
        Question: &quot;What&apos;s the weather in Oslo right now?&quot; Both answers below are
        simulated for illustration. The difference is not fluency, it is whether the specific
        claim can be traced to evidence in the context.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Without tools */}
        <div
          className="rounded-xl border border-[#1e293b] p-4"
          style={{ borderLeft: "3px solid var(--color-warning)" }}
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <p
              className="text-[11px] font-semibold uppercase tracking-[1.5px]"
              style={{ color: "var(--color-warning)" }}
            >
              Without tools
            </p>
            <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-[#334155] text-[#94a3b8]">
              Simulated response
            </span>
          </div>
          <p className="text-[13px] text-[#f1f5f9] leading-relaxed mb-3">
            &quot;Oslo summers are usually mild. Right now it is probably around 20 degrees
            with clear skies.&quot;
          </p>
          <p className="text-[11.5px] text-[#94a3b8] leading-relaxed">
            Plausible, fluent, and unverifiable. The model&apos;s knowledge stops at its
            training cutoff, so any specific number about &quot;right now&quot; is a guess
            dressed up as a fact. This is the same failure mode as{" "}
            <Link
              href="/visual-guides/hallucination"
              className="underline underline-offset-2 text-[#93c5fd] hover:text-white transition-colors"
            >
              hallucination
            </Link>
            : confident text with nothing behind it.
          </p>
        </div>

        {/* With tools */}
        <div
          className="rounded-xl border border-[#1e293b] p-4"
          style={{ borderLeft: "3px solid var(--color-success)" }}
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <p
              className="text-[11px] font-semibold uppercase tracking-[1.5px]"
              style={{ color: "var(--color-success)" }}
            >
              With tools
            </p>
            <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-[#334155] text-[#94a3b8]">
              Simulated response
            </span>
          </div>
          <p className="text-[13px] text-[#f1f5f9] leading-relaxed mb-3">
            &quot;It is currently 17 degrees Celsius and partly cloudy in Oslo, per the
            weather service.&quot;
          </p>
          <p className="text-[11.5px] text-[#94a3b8] leading-relaxed">
            The number comes from a tool result sitting in the conversation (the trace above),
            so the claim is grounded: you can point at the exact message it came from, log it,
            and audit it. Grounding does not make the model smarter, it makes the answer
            checkable.
          </p>
        </div>
      </div>
    </div>
  );
}
