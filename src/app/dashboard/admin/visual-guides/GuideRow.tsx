"use client";

import { useState } from "react";
import type { AdminCurriculumGuide, GuideVisibility } from "@/types/visual-guides";
import VisibilityDropdown from "./VisibilityDropdown";

interface Props {
  guide: AdminCurriculumGuide;
  categorySlug: string;
  indent?: boolean;
}

export default function GuideRow({ guide, categorySlug, indent = false }: Props) {
  const [visibility, setVisibility] = useState<GuideVisibility>(guide.visibility);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVisibilityChange(next: GuideVisibility) {
    const prev = visibility;
    setVisibility(next); // optimistic
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/admin/visual-guides/guide/${guide.slug}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: next }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
    } catch (err) {
      setVisibility(prev); // rollback
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 border-b border-white/5 hover:bg-white/[0.02] text-sm ${
        indent ? "pl-8" : ""
      }`}
    >
      {/* Order number */}
      <span className="text-[11px] text-gray-600 w-6 text-right shrink-0">
        {guide.order}
      </span>

      {/* Title */}
      <span className="flex-1 text-white/80 truncate text-[13px]">
        {guide.title}
      </span>

      {/* Implementation status */}
      <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${
        guide.implemented
          ? "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border-[var(--color-secondary)]/20"
          : "bg-white/5 text-gray-500 border-white/10"
      }`}>
        {guide.implemented ? "Built" : "Not Built"}
      </span>

      {/* Completion count */}
      {guide.implemented && (
        <span className="text-[11px] text-gray-500 w-16 text-right shrink-0">
          {guide.completionCount} {guide.completionCount === 1 ? "user" : "users"}
        </span>
      )}
      {!guide.implemented && (
        <span className="w-16 shrink-0" />
      )}

      {/* Visibility dropdown */}
      <div className="shrink-0">
        <VisibilityDropdown
          value={visibility}
          onChange={handleVisibilityChange}
          loading={loading}
          disabled={!guide.implemented}
          disabledReason="Build this guide first"
        />
      </div>

      {/* Inline error */}
      {error && (
        <span className="text-[11px] text-red-400 shrink-0 max-w-[120px] truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
