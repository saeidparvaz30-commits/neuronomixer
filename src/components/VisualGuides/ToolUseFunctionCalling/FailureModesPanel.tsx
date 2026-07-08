"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";

interface Props {
  onOpened: () => void;
  opened: boolean;
}

const SAFEGUARDS = [
  {
    title: "Validate arguments against the schema",
    body: "The model can emit malformed or out-of-range arguments. Validate every call against the JSON schema before executing; on failure, return a structured error as the tool result so the model can correct itself.",
  },
  {
    title: "Allowlist tools",
    body: "Execute only tools you explicitly registered. If the model names a tool that does not exist, return an error result instead of guessing what it meant.",
  },
  {
    title: "Timeouts and bounded retries",
    body: "Tools are network calls and databases; they hang and they flake. Wrap execution in timeouts with a bounded retry budget, and surface the failure to the model as a tool result rather than stalling the loop.",
  },
  {
    title: "Human confirmation for consequential actions",
    body: "Sending email, moving money, deleting data: anything hard to undo should require a human to approve the specific call and its arguments before the runtime executes it.",
  },
  {
    title: "Never execute model output as code without a sandbox",
    body: "If a tool runs model-generated code (SQL, shell, Python), treat that code as untrusted input: sandbox it, restrict permissions, and prefer read-only access wherever possible.",
  },
] as const;

export default function FailureModesPanel({ onOpened, opened }: Props) {
  const { fadeUp } = useGuideMotion();
  const [expanded, setExpanded] = useState(false);

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !opened) onOpened();
  }

  return (
    <div
      className="rounded-2xl border bg-[#0f172a] overflow-hidden"
      style={{ borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)" }}
    >
      <button
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls="failure-modes-content"
        className="w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[16px] leading-none"
            aria-hidden="true"
            style={{ color: "var(--color-warning)" }}
          >
            &#9888;
          </span>
          <div>
            <p className="text-[13px] font-semibold text-white">
              Failure modes and safeguards
            </p>
            <p className="text-[11px] text-[#475569] mt-0.5">
              What builders must handle before shipping tool use. Click to{" "}
              {expanded ? "collapse" : "expand"}.
            </p>
          </div>
        </div>
        <span
          className="text-[11px] font-semibold shrink-0"
          style={{ color: "var(--color-warning)" }}
        >
          {expanded ? "Hide" : "Show"} {opened ? "(read)" : ""}
        </span>
      </button>

      {expanded && (
        <motion.div
          id="failure-modes-content"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="px-5 sm:px-6 pb-5 border-t border-white/[0.05]"
        >
          <ul className="mt-4 space-y-3">
            {SAFEGUARDS.map((s) => (
              <li key={s.title} className="rounded-xl border border-[#1e293b] p-3.5">
                <p className="text-[12px] font-semibold text-white mb-1">{s.title}</p>
                <p className="text-[11.5px] text-[#94a3b8] leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ul>

          <div
            className="mt-4 rounded-xl border p-3.5"
            style={{
              borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
              background: "color-mix(in srgb, var(--color-warning) 6%, transparent)",
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-1"
              style={{ color: "var(--color-warning)" }}
            >
              The security risk agents inherit: prompt injection
            </p>
            <p className="text-[11.5px] text-[#94a3b8] leading-relaxed">
              Tool results can carry hostile instructions. A scraped web page or an email body
              can tell the model to ignore its rules and exfiltrate data, and the model can
              weigh it like your system prompt. Treat tool output as data, not
              instructions, and keep consequential actions behind confirmation. See the{" "}
              <Link
                href="/visual-guides/prompt-injection"
                className="underline underline-offset-2 text-[#93c5fd] hover:text-white transition-colors"
              >
                prompt injection guide
              </Link>{" "}
              for the full attack surface.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
