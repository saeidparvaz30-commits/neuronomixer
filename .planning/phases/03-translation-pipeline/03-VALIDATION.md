---
phase: 3
slug: translation-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-22
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none by design — `npx tsx` check scripts (repo convention) |
| **Config file** | none — Wave 0 not needed for framework install |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsx scripts/checks/language-filter.check.ts` + phase check scripts + `npx next build` (NEVER `npm run build` locally) |
| **Estimated runtime** | ~60-120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run the phase check scripts + `npx next build`
- **Before `/gsd-verify-work`:** Full gate set must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner) | | | PIPE-01, PIPE-02 | | | check script | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package-lock.json` repair — `npm ci --dry-run` green (per CONTEXT D-11; RESEARCH.md documents the proven `npm install --package-lock-only` repair)
- [ ] Env preflight one-liners: `ANTHROPIC_API_KEY` present; dev DB has `TokenUsage` + an `ADMIN` user (RESEARCH.md open item 4)

*No test framework install — existing check-script convention covers phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Farsi draft renders in Studio "Posts — Farsi" list with English source subtitle + translationNotes readable | PIPE-02 | Studio is behind Sanity auth; draft rendering is visual | Open /studio, check Posts — Farsi list, open the draft, read translationNotes |
| Saeid gates push + prod deploy before first prod-dataset run | PIPE-01 (rollout gate D-11) | External write, Saeid-gated by policy | In-session go/no-go |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
