# Visual Guides — Master Style & Pattern Spec

This file is the canonical reference for building and harmonizing all visual guides on NeuroNomixer.
When adding or editing any guide, follow every section here exactly.

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

## 2. NO Breadcrumbs

**Do not include a breadcrumb nav inside any guide page.**
The global navbar and the "← All Guides" button in the completion screen are sufficient navigation.
Remove any existing `<nav>` breadcrumb blocks at the top of client components.

---

## 3. Hero Section

Every guide starts with a standard hero block immediately after the outer wrapper:

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

Category label colors (use CSS var, not hardcoded hex):
- Data & Analysis → `text-[var(--color-accent)]` (#d4af37)
- Statistics       → `text-[var(--color-accent)]`
- Machine Learning → `text-[var(--color-accent)]`
- Deep Learning    → `text-[var(--color-accent)]`
- LLMs             → `text-[var(--color-accent)]`
- Applied AI       → `text-[var(--color-accent)]`

---

## 4. Completion Tracking

All guides fire a completion event via the same API route:

```ts
fetch("/api/visual-guides/complete", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ guideSlug: SLUG, score: SCORE }),
}).catch(() => {});
```

- Only fire when `session?.user` exists
- Use a `completionFired = useRef(false)` guard so it fires exactly once
- Fire inside a `useEffect` that watches the completion condition
- Score is a number — use a consistent scale:
  - `100` for fully interactive guides where the user explores all states
  - `5` for pipeline/step-through guides
  - `4` for playground guides with multiple required interactions

---

## 5. Progress Indicator

Show a small pill/dot row near the top of the guide for multi-step or multi-state guides.
Use the guide's accent color when a state is explored/completed, `#1e293b` when not.

```tsx
{STATES.map((s) => (
  <div key={s.id} className="flex items-center gap-1.5">
    <div className="w-2 h-2 rounded-full transition-colors"
      style={{ background: explored.has(s.id) ? s.color : "#1e293b" }} />
    <span className={`text-[11px] ${explored.has(s.id) ? "text-white" : "text-[#475569]"}`}>
      {s.label}
    </span>
  </div>
))}
```

---

## 6. Completion Screen (Summary Card)

Every guide that has a clear "done" state should show a completion card.
This is the most important UX moment — it should:

1. **Congratulate** the user with a title + optional confetti/particle burst
2. **Summarize** what they learned (key concepts explored, steps completed, etc.)
3. **Provide a Key Takeaway** — one italic quote that crystallizes the lesson
4. **Offer three navigation actions** (see Section 7)

### Completion card layout
```tsx
<motion.div
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: "spring", bounce: 0.2, duration: 0.65 }}
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
    <div className="rounded-xl border-l-4 border-[#d4af37] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
      <p className="text-[12px] font-semibold text-[#d4af37] mb-1.5 uppercase tracking-wide">Key Takeaway</p>
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
| Bottom-right (primary, gold) | **Next Guide →** | Links to the next guide slug in `GUIDES` order |

Rules:
- "← All Guides" is never the primary CTA — it should always be the subtle left button
- "Next Guide →" uses `bg-[var(--color-accent)] text-[#0a0e1a]` (gold, dark text)
- "Try Again" uses the bordered ghost style
- For guides where "Try Again" makes no sense (purely narrative), omit it
- If a guide is the LAST in the list, replace "Next Guide →" with "← All Guides" as primary

---

## 8. Guide Order & Next Guide Slugs

The canonical order from `VisualGuidesClient.tsx`:

| # | Title | Slug | Next Slug |
|---|---|---|---|
| 1 | What Is Data? | `what-is-data` | `how-datasets-are-built` |
| 2 | How Datasets Are Built | `how-datasets-are-built` | `missing-data` |
| 3 | Missing Data | `missing-data` | `feature-scaling` |
| 4 | Feature Scaling Playground | `feature-scaling` | `outlier-detection` |
| 5 | Outlier Detection | `outlier-detection` | `correlation-causation` |
| 6 | Correlation vs Causation | `correlation-causation` | `dimensionality-reduction` |
| 7 | Dimensionality Reduction | `dimensionality-reduction` | `data-distributions` |
| 8 | Data Distributions | `data-distributions` | `data-pipeline` |
| 9 | The Data Pipeline | `data-pipeline` | `central-limit-theorem` |
| 10 | Central Limit Theorem | `central-limit-theorem` | `p-values` |
| 11 | P-Values Demystified | `p-values` | `confidence-intervals` |
| 12 | Confidence Intervals | `confidence-intervals` | `bayes-theorem` |
| 13 | Bayes' Theorem | `bayes-theorem` | `probability-distributions` |
| 14 | Probability Distributions | `probability-distributions` | `hypothesis-testing` |
| 15 | Hypothesis Testing | `hypothesis-testing` | `regression-to-mean` |
| 16 | Regression to the Mean | `regression-to-mean` | `bias-variance` |
| 17 | Bias-Variance Tradeoff | `bias-variance` | `linear-regression` |
| 18 | Linear Regression | `linear-regression` | `decision-trees` |
| 19 | Decision Trees | `decision-trees` | `random-forests` |
| 20 | Random Forests | `random-forests` | `knn` |
| 21 | KNN | `knn` | `svm` |
| 22 | SVM | `svm` | `k-means` |
| 23 | K-Means Clustering | `k-means` | `cross-validation` |
| 24 | Cross-Validation | `cross-validation` | `overfitting-underfitting` |
| 25 | Overfitting & Underfitting | `overfitting-underfitting` | `roc-curves` |
| 26 | ROC Curves & AUC | `roc-curves` | `confusion-matrix` |
| 27 | Confusion Matrix | `confusion-matrix` | `gradient-descent` |
| 28 | Gradient Descent | `gradient-descent` | `neural-network` |
| 29 | Neural Network Playground | `neural-network` | `what-is-ml` |
| 30 | What Is Machine Learning? | `what-is-ml` | `activation-functions` |
| 31 | Activation Functions | `activation-functions` | `backpropagation` |
| 32 | Backpropagation | `backpropagation` | `cnns` |
| 33 | CNNs | `cnns` | `pooling-layers` |
| 34 | Pooling Layers | `pooling-layers` | `rnns-lstms` |
| 35 | RNNs & LSTMs | `rnns-lstms` | `dropout` |
| 36 | Dropout | `dropout` | `batch-normalization` |
| 37 | Batch Normalization | `batch-normalization` | `transfer-learning` |
| 38 | Transfer Learning | `transfer-learning` | `optimizers-race` |
| 39 | Optimizers Race | `optimizers-race` | `gans` |
| 40 | GANs | `gans` | `what-is-llm` |
| 41 | What Is an LLM? | `what-is-llm` | `tokenization` |
| 42 | Tokenization | `tokenization` | `embeddings` |
| 43 | Embeddings | `embeddings` | `self-attention` |
| 44 | Self-Attention | `self-attention` | `transformer-architecture` |
| 45 | Transformer Architecture | `transformer-architecture` | `temperature-topk` |
| 46 | Temperature & Top-K | `temperature-topk` | `context-windows` |
| 47 | Context Windows | `context-windows` | `hallucination` |
| 48 | Hallucination | `hallucination` | `fine-tuning-vs-prompting` |
| 49 | Fine-Tuning vs Prompting | `fine-tuning-vs-prompting` | `rag-explained` |
| 50 | RAG Explained | `rag-explained` | `vector-databases` |
| 51 | Vector Databases | `vector-databases` | `chunking-strategies` |
| 52 | Chunking Strategies | `chunking-strategies` | `prompt-engineering` |
| 53 | Prompt Engineering | `prompt-engineering` | `ai-agents` |
| 54 | AI Agents | `ai-agents` | `model-evaluation` |
| 55 | Model Evaluation | `model-evaluation` | `rlhf` |
| 56 | RLHF | `rlhf` | `lora-adapters` |
| 57 | LoRA & Adapters | `lora-adapters` | `ai-safety` |
| 58 | AI Safety | `ai-safety` | *(last — use All Guides as primary)* |

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
Primary (blue):   #1e5d8a
Secondary (teal): #3bb4a4
Red (error):      #ef4444
Purple:           #a855f7
Pink:             #ec4899

Category dot colors:
  data:          #3b82f6
  stats:         #d4af37
  ml:            #3bb4a4
  deep-learning: #a855f7
  llms:          #ef4444
  applied-ai:    #ec4899
```

---

## 10. Animations

- Use Framer Motion for all entrance/exit animations
- Standard card entrance: `initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}`
- Standard exit: `exit={{ opacity: 0, y: -6 }}`
- Completion card spring: `transition={{ type: "spring", bounce: 0.2, duration: 0.65 }}`
- Never use `Math.random()` directly — use a deterministic LCG seeded function for any pseudo-random data:

```ts
function lcg(seed: number) {
  return ((seed * 1664525 + 1013904223) & 0xFFFFFFFF) / 0xFFFFFFFF;
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
- **Tables**: always `border-collapse`, header `bg-[#1e293b]`, alternating rows `#0f172a` / `#162032` (opaque — never transparent)
- **Code/formula blocks**: `<pre>` with `bg-[#1e293b]/60 font-mono text-[#93c5fd]`
- **Completion check**: always a `useRef(false)` guard, never use state for this

---

## 12. Accessibility

- All interactive controls need `aria-label` or visible label
- Toggle groups use `role="radiogroup"` + `role="radio"` + `aria-checked`
- Completion messages use an `aria-live="polite"` region (hidden, sr-only)
- Color is never the sole indicator of state — always pair with shape or text

---

## 13. What NOT To Do

- No breadcrumbs inside guide pages
- No `Math.random()` in render — causes hydration mismatch
- No Recharts, Chart.js, or other charting libraries — SVG only
- No `bg-[color]/opacity` on table rows/cells that overlap other elements — use opaque hex
- No `Co-Authored-By` lines in commits
- Do not push to remote before local verification
