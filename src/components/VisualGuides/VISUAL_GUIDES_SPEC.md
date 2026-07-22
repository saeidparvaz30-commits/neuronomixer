# Visual Guides — Master Style & Pattern Spec

**v2 — 2026-07-05 (Phase 3 canonical standard)**

This file is the canonical reference for building and harmonizing all visual guides on NeuroNomixer.
When adding or editing any guide, follow every section here exactly. Where v1 and existing guides
disagree with this document, this document wins.

Reference implementation: `src/components/VisualGuides/TimeSeriesForecast/TimeSeriesForecastClient.tsx`.

---

## 1. Page Structure

Every guide lives at `/visual-guides/[slug]/page.tsx` (server component) and renders a single client component.

```
src/app/visual-guides/[slug]/page.tsx          ← server, sets metadata
src/components/VisualGuides/[GuideFolder]/     ← client components
  [Guide]Client.tsx                            ← root client component
  (optional sub-components per guide)
```

### page.tsx boilerplate
```tsx
import type { Metadata } from "next";
import GuideClient from "@/components/VisualGuides/[Folder]/[Guide]Client";

export const metadata: Metadata = {
  title: "[Guide Title] | NeuroNomixer",
  description: "[One-sentence description]",
};

export default function Page() {
  return <GuideClient />;
}
```

---

## 2. Canonical Shell (all categories)

Every guide uses the exact same outer shell. No per-category variations.

```tsx
<div className="min-h-screen pb-20">
  <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
    {/* breadcrumb nav */}
    {/* hero */}
    {/* guide content */}
  </div>
</div>
```

### Breadcrumb nav is STANDARD

The v1 "no breadcrumbs" rule is dead: 86 of 91 shipped guides have one, so it is the
de-facto and now official standard. Every guide renders a breadcrumb nav at the top of
the inner wrapper, before the hero:

```tsx
<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
  <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
    Visual Guides
  </Link>
  <span>/</span>
  <span className="text-[#94a3b8]">{GUIDE_TITLE}</span>
</nav>
```

---

## 3. Hero Section

Every guide starts with the standard gold-kicker hero immediately after the breadcrumb.
The kicker uses `var(--color-accent)` (gold) for EVERY category. No red, pink, or purple
kickers; category identity is carried by the label text, not the color.

```tsx
<section className="mb-8">
  <div className="flex items-center gap-2 mb-4">
    <span className="w-6 h-px bg-[var(--color-accent)]" />
    <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
      {CATEGORY_LABEL}  {/* e.g. "Data & Analysis", "Statistics", "Machine Learning" */}
    </span>
    <span className="w-6 h-px bg-[var(--color-accent)]" />
  </div>
  <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
    {TITLE_PLAIN}{" "}
    <span className="text-[var(--color-accent)]">{TITLE_ACCENT_PART}</span>
  </h1>
  <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
    {ONE_SENTENCE_EXPLAINER}
  </p>
</section>
```

---

## 4. Completion Tracking

`GuideCompletion` (`src/components/VisualGuides/GuideCompletion.tsx`) is the SINGLE writer
of completion state. Rules:

- Exactly ONE `<GuideCompletion isComplete={...} guideSlug="..." score={...} />` per guide,
  rendered from the MAIN client component (`[Guide]Client.tsx`). NEVER render it from a
  helper subcomponent: a past incident had `GuideCompletion` inside a conditionally mounted
  subcomponent whose local state scoped the completion flag, so completions fired on mount
  or never fired at all. Keep it at the top level of the main client component.
- `isComplete` must be gated by a REAL interaction flag (the user actually explored the
  required states or finished the exercise). Never `isComplete={true}` on mount, never a
  timer.
- NO direct `fetch("/api/visual-guides/complete", ...)` from guide code. GuideCompletion
  owns the API call, the once-only `useRef` guard, the auth check, the celebration overlay,
  the signup prompt for anonymous users, and the shared `aria-live` announcement.
- Score scale: `100` for fully interactive guides, `5` for pipeline/step-through guides,
  `4` for playground guides with multiple required interactions.

---

## 5. Progress Indicator

Show a small pill/dot row near the top of the guide for multi-step or multi-state guides.
Use the accent color when a state is explored/completed, `#1e293b` when not.

```tsx
{STATES.map((s) => (
  <div key={s.id} className="flex items-center gap-1.5">
    <div className="w-2 h-2 rounded-full transition-colors"
      style={{ background: explored.has(s.id) ? "var(--color-accent)" : "#1e293b" }} />
    <span className={`text-[11px] ${explored.has(s.id) ? "text-white" : "text-[#475569]"}`}>
      {s.label}
    </span>
  </div>
))}
```

---

## 6. Completion Card (required)

Every guide with a "done" state shows a completion card matching the TimeSeriesForecast
reference. It must contain, in order:

1. **Header**: gold rule + `Guide Complete` kicker (uppercase, tracking) + congrats title + subtitle
2. **Body**: guide-specific recap of what was learned
3. **Key Takeaway**: one italic quote in the gold-bordered callout, always present
4. **Footer**: the three navigation actions (Section 7)

### Completion card layout
```tsx
<motion.div
  variants={card}            // from useGuideMotion()
  initial="hidden"
  animate="visible"
  className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
>
  {/* Header */}
  <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
    <div className="flex items-center gap-2 mb-1">
      <span className="w-5 h-px bg-[var(--color-accent)]" />
      <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
        Guide Complete
      </span>
    </div>
    <h2 className="text-2xl font-extrabold tracking-tight text-white">{CONGRATS_TITLE}</h2>
    <p className="text-sm text-[#94a3b8] mt-1">{CONGRATS_SUBTITLE}</p>
  </div>

  {/* Body: recap / learned concepts */}
  <div className="px-6 py-5">
    {/* ... guide-specific recap content ... */}

    {/* Key Takeaway — always present */}
    <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
      <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">Key Takeaway</p>
      <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
        &quot;{KEY_TAKEAWAY_QUOTE}&quot;
      </p>
    </div>
  </div>

  {/* Footer — three buttons, always in this order */}
  <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
    {/* LEFT: All Guides */}
    <Link href="/visual-guides"
      className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
      ← All Guides
    </Link>

    {/* RIGHT: Try Again + Next Guide */}
    <div className="flex items-center gap-3">
      <button onClick={onReset}
        className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
        Try Again
      </button>
      <Link href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
        className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
        Next Guide →
      </Link>
    </div>
  </div>
</motion.div>
```

---

## 7. Footer Navigation Buttons — Rules

**Three buttons total. Always in this exact layout:**

| Position | Button | Behavior |
|---|---|---|
| Bottom-left | **← All Guides** | Links to `/visual-guides` |
| Bottom-right (secondary) | **Try Again** | Calls `onReset()` to restart the guide |
| Bottom-right (primary, gold) | **Next Guide →** | Links to the next guide slug |

Rules:
- "← All Guides" is never the primary CTA; it is always the subtle left button
- "Next Guide →" uses `bg-[var(--color-accent)] text-[#0a0e1a]` (gold, dark text)
- "Try Again" uses the bordered ghost style
- For guides where "Try Again" makes no sense (purely narrative), omit it
- If a guide is the LAST in the list, replace "Next Guide →" with "← All Guides" as primary

---

## 8. Guide Order & Categories

Guide order/categories: `prisma/seed-guides.ts` is the single source of truth.

---

## 9. Design Tokens

```
Background:   #0f172a
Surface:      #1e293b
Surface-2:    #162032  (alternate row in tables)
Border:       #1e293b
Border-muted: #334155
Text:         #f1f5f9
Text-muted:   #94a3b8
Text-dim:     #475569

Accent (gold):    #d4af37  — var(--color-accent)
Warning (orange): #f97316  — var(--color-warning)
Success (green):  #22c55e  — var(--color-success)
Primary (blue):   #1e5d8a
Secondary (teal): #3bb4a4
Red (error):      #ef4444
Purple:           #a855f7
Pink:             #ec4899
```

Rules:
- Accent, warning, and success are used ONLY via their CSS vars
  (`var(--color-accent)`, `var(--color-warning)`, `var(--color-success)`), never as raw hex.
- All other colors come from the token table above; do not invent new hex values per guide.

---

## 10. Animations

- All entrance/exit animation vocabulary comes from `@/lib/guideMotion` via `useGuideMotion()`:

```tsx
const { fadeUp, fadeIn, stagger, card, pop } = useGuideMotion();

<motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={GUIDE_VIEWPORT}>
```

- `useGuideMotion()` returns `{ fadeUp, fadeIn, stagger, card, pop }` and automatically
  swaps every variant to a short opacity-only fade when the user prefers reduced motion.
  Do NOT call `useReducedMotion()` per guide; the shared hook (and the shared
  GuideCelebration/GuideCompletion components) already handle it.
- NO ad-hoc variant objects in guide code. If a guide needs a motion pattern the shared
  vocabulary lacks, extend `guideMotion.ts` so every guide gets it.
- `GUIDE_EASE` (`[0.22, 1, 0.36, 1]`) and `GUIDE_VIEWPORT` (`{ once: true, amount: 0.3 }`)
  are exported for the rare inline `transition`/`viewport` prop.
- NO `Math.random()` at module scope or in render paths (hydration mismatch). Use the
  deterministic LCG for pseudo-random data:

```ts
function lcg(seed: number): number {
  return (((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}
```

- Border-beam animation (for clickable cards that need attention):

```css
@keyframes beam-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```
Wrap the card in `padding: 2px`, put the conic-gradient spinner inside, and the content div has `background: #0f172a` always.

---

## 11. Interactive Element Standards

- **Toggles / method selectors**: use `layoutId="[unique-id]"` Framer Motion pill
- **Scatter plots**: pure SVG, no external chart library
- **Sliders**: native `<input type="range">` styled with Tailwind, or custom drag with `useRef` + `onPointerMove`
- **Tables**: always `border-collapse`, header `bg-[#1e293b]`, alternating rows `#0f172a` / `#162032` (opaque, never transparent)
- **Code/formula blocks**: `<pre>` with `bg-[#1e293b]/60 font-mono text-[#93c5fd]`

---

## 12. Accessibility Checklist (required)

Every guide must pass all of these before shipping:

- [ ] Every `<input type="range">` has an associated label (`aria-label` or a visible `<label>`)
- [ ] Toggle/tab rows use `role="radiogroup"` with `role="radio"` + `aria-checked` on each
      option (or plain buttons with `aria-pressed`)
- [ ] Completion is announced via the shared GuideCompletion `aria-live="polite"` region;
      guides do not add their own completion announcements
- [ ] Interactive SVG/canvas visualizations have a keyboard-operable alternative or a text
      equivalent conveying the same information
- [ ] Color is never the sole indicator of state; always pair with shape, text, or icon

---

## 13. Content Rules (required)

- Every displayed number is either computed from the on-screen data/model, or visibly
  labeled "illustrative". No silently invented values.
- No fabricated benchmark results or vendor-internal figures. If a real number cannot be
  sourced, do not show a number.
- No em dashes in prose. Use commas, colons, or separate sentences.

---

## 14. What NOT To Do

- No `Math.random()` at module scope or in render (hydration mismatch)
- No ad-hoc framer-motion variant objects; use `useGuideMotion()`
- No direct fetch of `/api/visual-guides/complete` from guide code
- No `GuideCompletion` inside helper subcomponents; main client component only
- No Recharts, Chart.js, or other charting libraries; SVG only
- No `bg-[color]/opacity` on table rows/cells that overlap other elements; use opaque hex
- No raw hex for accent/warning/success; CSS vars only
- No `Co-Authored-By` lines in commits
- Do not push to remote before local verification

## 15. Mobile / Responsive (v3, required)

The shell (sections 2, 3, 6) already handles page-level responsiveness. These rules govern everything INSIDE a panel. A guide is not done until it passes the mobile gate (`scripts/mobile-gate.mjs`) at 360px client width.

1. **Grids collapse below `sm:`.** Fixed `grid-cols-N` (N >= 3) must be written `grid-cols-2 sm:grid-cols-N`, or `grid-cols-1 sm:grid-cols-N` when cells hold sentences. `grid-cols-2` may stay only when each cell is a short stat chip.
2. **Tables are always wrapped** in `<div className="overflow-x-auto">`.
3. **SVG labels render >= 10px at 360px viewport.** Minimum SVG font-size in user units = `ceil(viewBoxWidth / 33)` (viewBox 800 -> 24, 600 -> 19, 400 -> 13). If larger text collides, reduce tick density or shorten labels; never shrink the font below the threshold. Prefer moving chart titles and captions OUT of the SVG into HTML, which does not scale down.
4. **Touch targets >= 40px hit area.** Custom drag surfaces set `touch-action: none` (Tailwind `touch-none`). Native `<input type="range">` inherits the shared 24px-tall hit area from globals.css.
5. **No hover-only affordances.** Every `whileHover` reveal has a tap/focus equivalent (`whileTap`, `onClick`, or `onFocus`); instruction copy says "Tap or hover", never "Hover" alone.
6. **Horizontal-scroll escape hatch** (`min-w` + `overflow-x-auto`) only for intrinsically wide diagrams (timelines, pipelines); `min-w` <= 560px and nothing may be clipped without a reachable scroll.
