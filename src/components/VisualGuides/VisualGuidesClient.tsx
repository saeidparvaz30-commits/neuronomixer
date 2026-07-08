"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  CurriculumCategory,
  CurriculumGuide,
  CurriculumResponse,
  CurriculumUnit,
} from "@/types/visual-guides";

export default function VisualGuidesClient() {
  const [curriculum, setCurriculum] = useState<CurriculumResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const { data: session } = useSession();
  const [completions, setCompletions] = useState<Set<string>>(new Set());

  // Fetch curriculum (categories, units, guides) from the DB-backed API
  useEffect(() => {
    fetch("/api/visual-guides/curriculum")
      .then((r) => r.json())
      .then((data: CurriculumResponse) => setCurriculum(data))
      .catch(() => {});
  }, []);

  // Fetch user progress (completion badges)
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/visual-guides/progress")
      .then((r) => r.json())
      .then((data) => {
        setCompletions(new Set(data.completions.map((c: { guideSlug: string }) => c.guideSlug)));
      })
      .catch(() => {});
  }, [session?.user]);

  const categories = curriculum?.categories ?? [];

  // Determine which categories to display based on the active filter
  const visibleCategories =
    activeFilter === "all"
      ? categories
      : categories.filter((c) => c.slug === activeFilter);

  // Hero stat: implemented guide count across all published categories
  const implementedCount = categories.reduce((total, cat) => {
    const unitGuides = cat.units.flatMap((u) => u.guides);
    const topGuides = cat.guides;
    return total + [...unitGuides, ...topGuides].filter((g) => g.implemented).length;
  }, 0);

  // Learning path gradient
  const pathGradient = categories.map((c) => c.color).join(", ");

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-4 pt-6 pb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-6 h-px bg-[var(--color-accent)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
            Interactive Learning
          </span>
          <span className="w-6 h-px bg-[var(--color-accent)]" />
        </div>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none mb-5">
          Understand{" "}
          <span className="text-[var(--color-accent)]">AI</span>,{" "}
          <br />
          <span className="text-[var(--color-secondary)]">Visually</span>
        </h1>

        <p className="text-base text-[var(--color-text-muted)] leading-relaxed max-w-lg mx-auto mb-8">
          Interactive explorations of data science, machine learning, and AI concepts.
          No jargon. No walls of math. Just clarity.
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-10 sm:gap-14 flex-wrap mb-8">
          {[
            { num: implementedCount || "—", label: "Visual Guides" },
            { num: categories.length || "—", label: "Categories" },
            { num: "100%", label: "Interactive" },
          ].map(({ num, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-extrabold text-[var(--color-accent)]">{num}</div>
              <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Learning path dots (desktop only) */}
        {categories.length > 0 && (
          <div className="hidden sm:block max-w-2xl mx-auto mb-2 px-4">
            <div className="relative flex items-center justify-between">
              <div
                className="absolute top-1/2 -translate-y-1/2 left-[28px] right-[28px] h-px opacity-25"
                style={{ background: `linear-gradient(90deg, ${pathGradient})` }}
              />
              {categories.map((cat, i) => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveFilter(cat.slug)}
                  className="relative z-10 flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white/10 shadow-lg group-hover:scale-110 transition-transform"
                    style={{ background: cat.color }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--color-text-muted)] group-hover:text-white transition-colors whitespace-nowrap">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-[72px] z-40 bg-[#0f172a]/90 backdrop-blur-xl py-4 border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="flex justify-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-[13px] font-semibold border transition-all ${
                activeFilter === "all"
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[#0f172a]"
                  : "border-white/10 text-[var(--color-text-muted)] hover:border-white/20 hover:text-white"
              }`}
            >
              All Guides
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveFilter(cat.slug)}
                className={`px-3.5 py-1.5 rounded-xl text-[13px] font-semibold border transition-all ${
                  activeFilter === cat.slug
                    ? "border-transparent text-white"
                    : "border-white/10 text-[var(--color-text-muted)] hover:border-white/20 hover:text-white"
                }`}
                style={
                  activeFilter === cat.slug
                    ? { background: cat.color, borderColor: cat.color }
                    : undefined
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 pt-2">
        {/* Loading skeleton */}
        {curriculum === null && (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state — all categories DRAFT */}
        {curriculum !== null && categories.length === 0 && (
          <p className="text-center text-[var(--color-text-muted)] py-20">
            Guides launching soon — check back shortly.
          </p>
        )}

        {/* Guide grid */}
        {curriculum !== null && categories.length > 0 && (
          <AnimatePresence mode="wait">
            {visibleCategories.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-[var(--color-text-muted)] py-20"
              >
                No guides match your filter.
              </motion.p>
            ) : (
              <motion.div key={activeFilter} initial={false}>
                {visibleCategories.map((cat) => (
                  <CategorySection
                    key={cat.slug}
                    category={cat}
                    completions={completions}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── Category section ────────────────────────────────────────────────────────

function CategorySection({
  category: cat,
  completions,
}: {
  category: CurriculumCategory;
  completions: Set<string>;
}) {
  const hasUnits = cat.units.length > 0;

  // Count all guides in the category for the header label
  const totalGuides =
    cat.guides.length + cat.units.reduce((sum, u) => sum + u.guides.length, 0);

  return (
    <div>
      {/* Category header */}
      <div className="flex items-center gap-3 mt-10 mb-4 pb-2.5 border-b border-white/[0.07]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: cat.color }}
        >
          {cat.order}
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-white">{cat.name}</h2>
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
          {totalGuides} guide{totalGuides !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Categories with units */}
      {hasUnits &&
        cat.units.map((unit) => (
          <UnitSection
            key={unit.slug}
            unit={unit}
            cat={cat}
            completions={completions}
          />
        ))}

      {/* Categories without units — flat grid */}
      {!hasUnits && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cat.guides.map((guide, i) => (
            <GuideCard
              key={guide.slug}
              guide={guide}
              cat={cat}
              index={i}
              completed={completions.has(guide.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Unit section ─────────────────────────────────────────────────────────────

function UnitSection({
  unit,
  cat,
  completions,
}: {
  unit: CurriculumUnit;
  cat: CurriculumCategory;
  completions: Set<string>;
}) {
  return (
    <div className="mb-6">
      {/* Unit header */}
      <div className="flex items-center gap-2 mt-6 mb-3 ml-1">
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Unit {unit.order}
        </span>
        <span className="text-[11px] text-white/30">|</span>
        <span className="text-[13px] font-medium text-white/80">{unit.name}</span>
        <span className="ml-auto text-[11px] text-[var(--color-text-muted)]">
          {unit.guides.length} guide{unit.guides.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {unit.guides.map((guide, i) => (
          <GuideCard
            key={guide.slug}
            guide={guide}
            cat={cat}
            index={i}
            completed={completions.has(guide.slug)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Guide card ───────────────────────────────────────────────────────────────

function GuideCard({
  guide,
  cat,
  index,
  completed,
}: {
  guide: CurriculumGuide;
  cat: CurriculumCategory;
  index: number;
  completed: boolean;
}) {
  if (!guide.implemented) {
    return <ComingSoonCard guide={guide} cat={cat} index={index} />;
  }

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="relative flex flex-col bg-[var(--background)] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/20 hover:-translate-y-1 transition-all cursor-pointer group"
    >
      {/* Colored top accent */}
      <div
        className="h-0.5 w-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: cat.color }}
      />

      {/* Completion badge */}
      {completed && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#3bb4a4]/15 border border-[#3bb4a4]/30 rounded-lg px-2.5 py-1 z-10">
          <svg
            className="w-3.5 h-3.5 text-[#3bb4a4]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[10px] font-semibold text-[#3bb4a4] uppercase tracking-wide">
            Completed
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-[18px]">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.8px] mb-2"
          style={{ color: cat.color }}
        >
          {cat.name}
        </p>
        <h3 className="text-[15px] font-semibold text-white leading-snug mb-2">
          {guide.title}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-2 mb-3 flex-1">
          {guide.description}
        </p>
        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.07] mt-auto">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
            <span>{guide.interactiveType}</span>
            <span className="text-white/20">&middot;</span>
            <span>{guide.audience}</span>
          </div>
          <span
            className="text-[13px] font-medium transition-all group-hover:translate-x-1"
            style={{ color: "var(--color-accent)" }}
          >
            Explore &rarr;
          </span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <Link href={`/visual-guides/${guide.slug}`} className="block">
      {card}
    </Link>
  );
}

// ── Coming soon card ─────────────────────────────────────────────────────────

function ComingSoonCard({
  guide,
  cat,
  index,
}: {
  guide: CurriculumGuide;
  cat: CurriculumCategory;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="relative flex flex-col bg-[var(--background)] border border-white/[0.04] rounded-2xl overflow-hidden opacity-50 cursor-default"
    >
      <div className="flex flex-col flex-1 p-[18px]">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.8px] mb-2"
          style={{ color: cat.color, opacity: 0.5 }}
        >
          {cat.name}
        </p>
        <h3 className="text-[15px] font-semibold text-white/50 leading-snug mb-2">
          {guide.title}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)]/50 leading-relaxed line-clamp-2 mb-3 flex-1">
          {guide.description}
        </p>
        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.04] mt-auto">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]/50">
            <span>{guide.interactiveType}</span>
          </div>
          <span className="text-[11px] font-medium text-[var(--color-text-muted)]/30 italic">
            Coming Soon
          </span>
        </div>
      </div>
    </motion.div>
  );
}
