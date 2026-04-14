"use client";

import React from "react";
import { TestType } from "./types";

interface Props {
  testType: TestType;
  onChange: (v: TestType) => void;
}

export default function TestTypeToggle({ testType, onChange }: Props) {
  const isTwoTailed = testType === "two-tailed";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Test Type
      </p>
      <div className="flex gap-2">
        <button
          role="switch"
          aria-checked={isTwoTailed}
          onClick={() => onChange("two-tailed")}
          className="flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all"
          style={{
            borderColor: isTwoTailed ? "#3bb4a4" : "#1e293b",
            color: isTwoTailed ? "#3bb4a4" : "#475569",
            background: isTwoTailed ? "#3bb4a415" : "transparent",
          }}
        >
          Two-tailed
        </button>
        <button
          role="switch"
          aria-checked={!isTwoTailed}
          onClick={() => onChange("one-tailed")}
          className="flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all"
          style={{
            borderColor: !isTwoTailed ? "#3bb4a4" : "#1e293b",
            color: !isTwoTailed ? "#3bb4a4" : "#475569",
            background: !isTwoTailed ? "#3bb4a415" : "transparent",
          }}
        >
          One-tailed
        </button>
      </div>
      <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
        {isTwoTailed
          ? "Two-tailed: Are the groups different in either direction? Divides α between both tails. Use this when you have no prior directional hypothesis."
          : "One-tailed: Is Group A specifically larger (or smaller) than Group B? Uses the full α in one tail. Only valid when direction is pre-specified."}
      </p>
    </div>
  );
}
