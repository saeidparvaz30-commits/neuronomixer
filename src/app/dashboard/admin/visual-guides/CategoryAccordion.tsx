"use client";

import { useState } from "react";
import type { AdminCurriculumCategory, GuideVisibility } from "@/types/visual-guides";
import VisibilityDropdown from "./VisibilityDropdown";
import GuideRow from "./GuideRow";

interface Props {
  categories: AdminCurriculumCategory[];
}

export default function CategoryAccordion({ categories: initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState<Record<string, boolean>>({});
  const [bulkError, setBulkError] = useState<Record<string, string>>({});
  const [catLoading, setCatLoading] = useState<Record<string, boolean>>({});

  function toggleOpen(slug: string) {
    setOpen((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  async function handleCategoryVisibility(slug: string, next: GuideVisibility) {
    const prev = categories.find((c) => c.slug === slug)?.visibility;
    setCategories((cats) =>
      cats.map((c) => (c.slug === slug ? { ...c, visibility: next } : c))
    );
    setCatLoading((l) => ({ ...l, [slug]: true }));
    try {
      const res = await fetch(`/api/dashboard/admin/visual-guides/category/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // rollback
      setCategories((cats) =>
        cats.map((c) => (c.slug === slug ? { ...c, visibility: prev! } : c))
      );
    } finally {
      setCatLoading((l) => ({ ...l, [slug]: false }));
    }
  }

  async function handleBulkPublish(slug: string) {
    if (!confirm(`Publish all implemented guides in this category? They will become visible on the public site.`)) return;
    setBulkLoading((l) => ({ ...l, [slug]: true }));
    setBulkError((e) => ({ ...e, [slug]: "" }));
    try {
      const res = await fetch(
        `/api/dashboard/admin/visual-guides/category/${slug}/bulk-publish`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to bulk publish");
      const data = await res.json();
      // Update local state: set category + all implemented guides to PUBLISHED
      setCategories((cats) =>
        cats.map((c) => {
          if (c.slug !== slug) return c;
          return {
            ...c,
            visibility: "PUBLISHED" as GuideVisibility,
            units: c.units.map((u) => ({
              ...u,
              visibility: "PUBLISHED" as GuideVisibility,
              guides: u.guides.map((g) => ({
                ...g,
                visibility: g.implemented ? ("PUBLISHED" as GuideVisibility) : g.visibility,
              })),
            })),
            guides: c.guides.map((g) => ({
              ...g,
              visibility: g.implemented ? ("PUBLISHED" as GuideVisibility) : g.visibility,
            })),
          };
        })
      );
      console.log(`Published ${data.guidesPublished} guides in ${slug}`);
    } catch {
      setBulkError((e) => ({ ...e, [slug]: "Bulk publish failed" }));
    } finally {
      setBulkLoading((l) => ({ ...l, [slug]: false }));
    }
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const allGuides = [
          ...cat.guides,
          ...cat.units.flatMap((u) => u.guides),
        ];
        const implementedCount = allGuides.filter((g) => g.implemented).length;
        const publishedCount = allGuides.filter((g) => g.visibility === "PUBLISHED").length;
        const isOpen = !!open[cat.slug];

        return (
          <div
            key={cat.slug}
            className="bg-[#060d18]/80 border border-white/10 rounded-2xl overflow-hidden"
          >
            {/* Category header row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              {/* Color dot + toggle */}
              <button
                onClick={() => toggleOpen(cat.slug)}
                className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: cat.color }}
                />
                <span className="font-semibold text-white text-[15px] truncate">
                  {cat.name}
                </span>
                <span className="text-xs text-gray-500 shrink-0">
                  {implementedCount} built · {publishedCount} published · {allGuides.length} total
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Bulk publish */}
              <div className="flex items-center gap-2 shrink-0">
                {bulkError[cat.slug] && (
                  <span className="text-[11px] text-red-400">{bulkError[cat.slug]}</span>
                )}
                <button
                  onClick={() => handleBulkPublish(cat.slug)}
                  disabled={implementedCount === 0 || bulkLoading[cat.slug]}
                  className="text-[12px] px-3 py-1 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  {bulkLoading[cat.slug] ? "Publishing…" : "Bulk Publish"}
                </button>

                {/* Category visibility */}
                <VisibilityDropdown
                  value={cat.visibility}
                  onChange={(v) => handleCategoryVisibility(cat.slug, v)}
                  loading={catLoading[cat.slug]}
                />
              </div>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div>
                {/* Categories with units (Statistics) */}
                {cat.units.length > 0 &&
                  cat.units.map((unit) => (
                    <div key={unit.slug}>
                      {/* Unit header */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.02] border-b border-white/5">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                          Unit {unit.order}
                        </span>
                        <span className="text-white/30 text-[11px]">|</span>
                        <span className="text-[13px] font-medium text-white/70 flex-1">
                          {unit.name}
                        </span>
                        <span className="text-[11px] text-gray-600 shrink-0">
                          {unit.guides.length} guide{unit.guides.length !== 1 ? "s" : ""}
                        </span>
                        <UnitVisibilityCell unitSlug={unit.slug} initialVisibility={unit.visibility} />
                      </div>
                      {/* Guides in this unit */}
                      {unit.guides.map((guide) => (
                        <GuideRow
                          key={guide.slug}
                          guide={guide}
                          categorySlug={cat.slug}
                          indent
                        />
                      ))}
                    </div>
                  ))}

                {/* Categories without units (flat guide list) */}
                {cat.units.length === 0 &&
                  cat.guides.map((guide) => (
                    <GuideRow
                      key={guide.slug}
                      guide={guide}
                      categorySlug={cat.slug}
                    />
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Small inline component for unit visibility — avoids prop-drilling through GuideRow
function UnitVisibilityCell({
  unitSlug,
  initialVisibility,
}: {
  unitSlug: string;
  initialVisibility: GuideVisibility;
}) {
  const [visibility, setVisibility] = useState<GuideVisibility>(initialVisibility);
  const [loading, setLoading] = useState(false);

  async function handleChange(next: GuideVisibility) {
    const prev = visibility;
    setVisibility(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/admin/visual-guides/unit/${unitSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setVisibility(prev);
    } finally {
      setLoading(false);
    }
  }

  return (
    <VisibilityDropdown value={visibility} onChange={handleChange} loading={loading} />
  );
}
