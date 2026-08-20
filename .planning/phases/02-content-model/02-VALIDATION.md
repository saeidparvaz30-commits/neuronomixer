---
phase: 2
slug: content-model
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none by design — `npx tsx` check scripts + browser smoke |
| **Config file** | none — Wave 0 installs nothing (no test framework, per ROADMAP standing constraints) |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npx next build` (NEVER `npm run build` — it runs `prisma migrate deploy` against the PRODUCTION DB) |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit && npx next build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner) | | | CONTENT-01, CONTENT-02 | — | | tsx script | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — `npx tsx` check scripts are authored inside the phase's tasks (read-only GROQ fragment test, schema shape import test, before/after listing parity probe per 02-RESEARCH.md §Validation Architecture).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Studio structure shows two language-filtered lists with correct previews | CONTENT-01 | Sanity Studio is interactive UI; no automated harness | Open /studio in dev, confirm "Posts — English" and "Posts — Farsi" lists, Farsi preview subtitle shows English source title |
| Production migration `--execute` run | CONTENT-01 | Mutates live content; gated on Saeid's explicit go (D-09) | Run dry-run, review report, then re-run with --execute after approval |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
