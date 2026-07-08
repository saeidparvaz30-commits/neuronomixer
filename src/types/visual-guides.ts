// Types for the Visual Guides curriculum API.
// Shared between the public API route, admin API routes, and VisualGuidesClient.

export type GuideVisibility = "DRAFT" | "PUBLISHED" | "HIDDEN";

export interface CurriculumGuide {
  id: string;
  slug: string;
  title: string;
  description: string;
  interactiveType: string;
  audience: string;
  order: number;
  implemented: boolean;
  nextGuideSlug: string | null;
}

export interface CurriculumUnit {
  id: string;
  slug: string;
  name: string;
  order: number;
  guides: CurriculumGuide[];
}

export interface CurriculumCategory {
  id: string;
  slug: string;
  name: string;
  color: string;
  order: number;
  /** Units (populated for Statistics; empty array for categories without units) */
  units: CurriculumUnit[];
  /** Top-level guides not assigned to any unit */
  guides: CurriculumGuide[];
}

export interface CurriculumResponse {
  categories: CurriculumCategory[];
}

// ── Admin-only extensions ────────────────────────────────────────────────────

export interface AdminCurriculumGuide extends CurriculumGuide {
  visibility: GuideVisibility;
  completionCount: number;
}

export interface AdminCurriculumUnit extends Omit<CurriculumUnit, "guides"> {
  visibility: GuideVisibility;
  guides: AdminCurriculumGuide[];
}

export interface AdminCurriculumCategory extends Omit<CurriculumCategory, "units" | "guides"> {
  description: string | null;
  visibility: GuideVisibility;
  units: AdminCurriculumUnit[];
  guides: AdminCurriculumGuide[];
}

export interface AdminCurriculumResponse {
  categories: AdminCurriculumCategory[];
}
