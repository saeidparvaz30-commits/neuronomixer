# Phase 3: Translation Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-22
**Phase:** 3-Translation Pipeline
**Areas discussed:** Glossary seed and correction loop, Verify findings and draft gating, Re-run and overwrite policy, Rollout sequencing and gates

---

## Glossary seed and correction loop

| Option | Description | Selected |
|--------|-------------|----------|
| Lean core (~60-100 terms) | High-frequency terms only; grows organically via verify-pass findings | ✓ |
| Comprehensive (~200+ terms) | Sweep everything recurring incl. finance/regulatory jargon | |
| You decide | Simorgh picks the cut from corpus frequency | |

| Option | Description | Selected |
|--------|-------------|----------|
| Term + rendering + strategy | Strategy tag: translate / transliterate / keep-english | ✓ |
| Simple map | Flat term→rendering pairs | |
| You decide | Schema the verify pass checks most reliably | |

| Option | Description | Selected |
|--------|-------------|----------|
| Readable table + JSON | HTML review table (term, rendering, strategy, frequency, example) + JSON; corrections round-tripped | ✓ |
| Edit the JSON directly | JSON only, edited in place | |

| Option | Description | Selected |
|--------|-------------|----------|
| Follow Farsi tech-press usage | Keep English in Latin script where idiomatic | ✓ |
| Prefer Farsi, English in parentheses | Academic register, heavier prose | |

---

## Verify findings and draft gating

| Option | Description | Selected |
|--------|-------------|----------|
| Two-tier: block structural, note the rest | Code validates structure and blocks; Claude findings become notes | ✓ |
| Always write the draft | Everything lands as draft with notes | |
| Block on any finding | Draft only when verify pass is clean | |

| Option | Description | Selected |
|--------|-------------|----------|
| Compact human summary | One English line per finding; explicit clean line | ✓ |
| Raw JSON dump | Structured output stored verbatim | |

| Option | Description | Selected |
|--------|-------------|----------|
| Title + excerpt + SEO fields | All reader/search-visible text; slug/categories/author/images untouched | ✓ |
| Title + body only | Excerpt/SEO stay English until Phase 5 | |
| You decide | Planner reads postType.ts | |

---

## Re-run and overwrite policy

| Option | Description | Selected |
|--------|-------------|----------|
| Report stale, retranslate only on flag | Default touches nothing; --retranslate redoes | ✓ |
| Auto-retranslate drafts, skip published | Loses Studio edits on touched drafts | |
| Always auto-retranslate | Most destructive to manual edits | |

| Option | Description | Selected |
|--------|-------------|----------|
| --slug, --all, default=new only | Plus --dry-run; mirrors migrate-post-language.ts | ✓ |
| Interactive picker | Prompts each run; bad for automation | |
| You decide | Planner matches repo conventions | |

---

## Rollout sequencing and gates

| Option | Description | Selected |
|--------|-------------|----------|
| Existing dev dataset | blog_posts_dev; already wired, dataset cap avoided | ✓ |
| Fresh scratch dataset | Cleanest but plan-limit + wiring cost | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fold in as wave 0 | Lockfile repair → Saeid-gated push + prod deploy → prod run | ✓ |
| Dev-only phase, prod later | Success criterion proven on dev only | |
| Push/deploy first, before any build | Clear the 56-commit backlog immediately | |

---

## Claude's Discretion

- Batch chunking, polling cadence, partial-failure resume
- TokenUsage recording mechanics (env/DB targeting)
- Glossary JSON schema + prompt-cache-friendly injection format
- Verify-pass structured-output JSON schema
- Staleness timestamp storage mechanism

## Deferred Ideas

- Dashboard translation-status columns (Phase 4/5 if draft management gets noisy)
- Wiring the weekly batch-post-builder translation step (after this phase proves the script)
- `/cv/[slug]` unguarded generateStaticParams (pre-existing, separate quick task)
