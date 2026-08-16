"use client";

import type { GuideVisibility } from "@/types/visual-guides";

const OPTIONS: { value: GuideVisibility; label: string }[] = [
  { value: "DRAFT",     label: "Draft"     },
  { value: "PUBLISHED", label: "Published" },
  { value: "HIDDEN",    label: "Hidden"    },
];

const BADGE_CLASSES: Record<GuideVisibility, string> = {
  DRAFT:     "bg-gray-500/20 text-gray-300 border-gray-500/30",
  PUBLISHED: "bg-green-500/20 text-green-300 border-green-500/30",
  HIDDEN:    "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

interface Props {
  value: GuideVisibility;
  onChange: (v: GuideVisibility) => void;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export default function VisibilityDropdown({
  value,
  onChange,
  loading = false,
  disabled = false,
  disabledReason,
}: Props) {
  return (
    <div className="relative" title={disabled ? disabledReason : undefined}>
      <select
        value={value}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value as GuideVisibility)}
        className={`
          text-xs font-medium px-2 py-1 rounded-lg border appearance-none
          bg-[#060d18] cursor-pointer transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed
          focus:outline-none focus:ring-1 focus:ring-white/20
          ${BADGE_CLASSES[value]}
          ${loading ? "animate-pulse" : ""}
        `}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#060d18] text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
