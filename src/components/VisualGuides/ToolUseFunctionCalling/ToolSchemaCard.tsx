"use client";

import React from "react";
import Link from "next/link";

// Anthropic-style tool schema (OpenAI names the params block "parameters").
const SCHEMA_JSON = `{
  "name": "get_weather",
  "description": "Get the current weather for a location. Use when the user asks about present conditions, not forecasts.",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City and country, e.g. \\"Oslo, Norway\\""
      },
      "unit": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "description": "Temperature unit for the result"
      }
    },
    "required": ["location"]
  }
}`;

const PARTS = [
  {
    part: "name",
    color: "var(--color-accent)",
    note: "The stable identifier the model emits when it wants this tool. Keep it short, verb-first, and unambiguous.",
  },
  {
    part: "description",
    color: "#3bb4a4",
    note: "The model's only guide for WHEN to call the tool. This is prompt engineering: write it like documentation for a new teammate, including when not to use it.",
  },
  {
    part: "input_schema",
    color: "#a855f7",
    note: "JSON Schema for the arguments. The model fills it in; your runtime validates against it before executing. Enums like unit constrain the model to legal values.",
  },
] as const;

export default function ToolSchemaCard() {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <p className="text-[13px] font-semibold text-white mb-1">
        The contract: name, description, parameters
      </p>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[640px]">
        A tool definition is a small contract between your code and the model. The model
        never sees your implementation, only this schema. Writing a good description is{" "}
        <Link
          href="/visual-guides/prompt-engineering"
          className="underline underline-offset-2 text-[#93c5fd] hover:text-white transition-colors"
        >
          prompt engineering
        </Link>{" "}
        in miniature.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <pre className="rounded-xl bg-[#1e293b]/60 font-mono text-[11.5px] text-[#93c5fd] p-4 overflow-x-auto">
          {SCHEMA_JSON}
        </pre>

        <div className="flex flex-col gap-3">
          {PARTS.map(({ part, color, note }) => (
            <div key={part} className="rounded-xl border border-[#1e293b] p-3.5">
              <p className="text-[11px] font-mono font-bold mb-1" style={{ color }}>
                {part}
              </p>
              <p className="text-[11.5px] text-[#94a3b8] leading-relaxed">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
