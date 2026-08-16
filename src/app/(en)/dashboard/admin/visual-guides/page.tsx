import { prisma } from "@/lib/prisma";
import type { AdminCurriculumCategory, AdminCurriculumGuide, AdminCurriculumUnit } from "@/types/visual-guides";
import CategoryAccordion from "./CategoryAccordion";

export default async function AdminVisualGuidesPage() {
  // Fetch completion counts grouped by slug
  const completionGroups = await prisma.guideCompletion.groupBy({
    by: ["guideSlug"],
    _count: { guideSlug: true },
  });
  const completionMap = Object.fromEntries(
    completionGroups.map((g) => [g.guideSlug, g._count.guideSlug])
  );

  const raw = await prisma.guideCategory.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      color: true,
      order: true,
      visibility: true,
      units: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          order: true,
          visibility: true,
          guides: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              interactiveType: true,
              audience: true,
              order: true,
              implemented: true,
              nextGuideSlug: true,
              visibility: true,
            },
          },
        },
      },
      guides: {
        where: { unitId: null },
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          interactiveType: true,
          audience: true,
          order: true,
          implemented: true,
          nextGuideSlug: true,
          visibility: true,
        },
      },
    },
  });

  // Attach completion counts and cast to typed structure
  const categories: AdminCurriculumCategory[] = raw.map((cat) => ({
    ...cat,
    units: cat.units.map((unit): AdminCurriculumUnit => ({
      ...unit,
      guides: unit.guides.map((g): AdminCurriculumGuide => ({
        ...g,
        completionCount: completionMap[g.slug] ?? 0,
      })),
    })),
    guides: cat.guides.map((g): AdminCurriculumGuide => ({
      ...g,
      completionCount: completionMap[g.slug] ?? 0,
    })),
  }));

  // Summary stats
  const allGuides = categories.flatMap((c) => [
    ...c.guides,
    ...c.units.flatMap((u) => u.guides),
  ]);
  const totalGuides     = allGuides.length;
  const implemented     = allGuides.filter((g) => g.implemented).length;
  const published       = allGuides.filter((g) => g.visibility === "PUBLISHED").length;
  const draft           = allGuides.filter((g) => g.visibility === "DRAFT").length;
  const hidden          = allGuides.filter((g) => g.visibility === "HIDDEN").length;
  const totalCompletions = Object.values(completionMap).reduce((a, b) => a + b, 0);

  const stats = [
    { label: "Total Guides",       value: totalGuides },
    { label: "Implemented",         value: implemented },
    { label: "Published",           value: published },
    { label: "Draft",               value: draft },
    { label: "Hidden",              value: hidden },
    { label: "Total Completions",   value: totalCompletions },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Visual Guides</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="bg-[#060d18]/80 border border-white/10 rounded-xl px-4 py-3 text-center"
          >
            <div className="text-xl font-bold text-[var(--color-accent)]">{value}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Category accordion */}
      <CategoryAccordion categories={categories} />
    </div>
  );
}
