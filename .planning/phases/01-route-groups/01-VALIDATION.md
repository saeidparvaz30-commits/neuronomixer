---
phase: 1
slug: route-groups
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none by design — `npx tsx` check scripts + build gates + browser smoke |
| **Config file** | none — Wave 0 not required (no framework installs permitted) |
| **Quick run command** | `npx tsc --noEmit` (after deleting stale `tsconfig.tsbuildinfo`) |
| **Full suite command** | `npx next build` (NEVER `npm run build` — it chains `prisma migrate deploy` against the production DB) |
| **Estimated runtime** | tsc ~30s; next build ~3-5 min |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx next build`
- **Before `/gsd-verify-work`:** Full build green + route-manifest diff empty
- **Max feedback latency:** ~300 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 1 | ROUTE-02 | T-01-06, T-01-SC | Green-at-HEAD proof so any later failure is attributable to the move; no package install | build-gate + baseline capture | `rm -rf .next tsconfig.tsbuildinfo && npx tsc --noEmit && npx next build && node scripts/checks/route-smoke.mjs --record` | ✅ created by this task | ⬜ pending |
| 01-01-T2 | 01-01 | 1 | ROUTE-02 | T-01-01, T-01-02, T-01-03, T-01-07 | NextAuthProvider nesting preserved; 9 admin/author specifiers prefix-inserted only; middleware untouched; guide discovery path fixed | static structure check | `test "$(ls src/app/ \| sort \| tr '\n' ' ')" = "(en) api icon.svg robots.ts sitemap.ts " && test "$(grep -rn '@/app/(en)/dashboard/' src/app/ \| wc -l)" = "9"` | ✅ existing tree | ⬜ pending |
| 01-01-T3 | 01-01 | 1 | ROUTE-02 | T-01-03, T-01-04, T-01-05, T-01-06, T-01-DB | Zero URL loss; robots/sitemap/studio still emit; middleware diff empty; never `npm run build` | build-artifact diff + smoke | `rm -rf .next tsconfig.tsbuildinfo && npx tsc --noEmit && npx next build && diff artifacts/routes-before.txt artifacts/routes-after.txt && node scripts/checks/route-smoke.mjs --verify` | ✅ after T1 | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | ROUTE-02 | T-01-09, T-01-10 | Farsi layout carries exactly one import (globals.css) so no auth/analytics surface leaks into the unauthenticated tree | static structure check | `npx tsc --noEmit && test "$(grep -c '^import ' 'src/app/(fa)/layout.tsx')" = "1"` | ✅ created by this task | ⬜ pending |
| 01-02-T2 | 01-02 | 2 | ROUTE-02 | — | Existing `--record`/`--verify` behavior and baseline shape preserved | parse + regression check | `node --check scripts/checks/route-smoke.mjs && npx tsc --noEmit` | ✅ from 01-01 | ⬜ pending |
| 01-02-T3 | 01-02 | 2 | ROUTE-02 | T-01-08, T-01-11, T-01-12, T-01-DB | Branded 404 survives two root layouts (BLOCKING); `next.config.ts` untouched; middleware untouched | build-artifact diff + smoke | `npx tsc --noEmit && npx next build && node scripts/checks/route-smoke.mjs --verify && node scripts/checks/route-smoke.mjs --fa-check` | ✅ after 01-02-T2 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity:** no three consecutive tasks lack an automated verify — every task in both plans carries one. Longest feedback latency is 01-01-T3 and 01-02-T3 (cold `npx next build`, ~3-5 min); all other tasks return in under 60 seconds.

**Blocking gate:** 01-02-T3's unmatched-URL assertion is the OQ-1 resolution point. On failure the executor STOPS and surfaces to Saeid. No contingency (`experimental.globalNotFound`, `global-not-found.tsx`, a `(fa)/not-found.tsx`) is pre-authorized.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework may be installed (no-new-dependency constraint; no test framework by design).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Route smoke list renders correctly in browser | ROUTE-02 | No E2E framework; previews behind SSO | Dev server + Saeid's Chrome via claude-in-chrome: one guide per category, `/blog`, one post, `/visual-guides`, `/cv`, `/share/[token]`, dashboard |
| Branded 404 survives the root-layout split (OQ-1) | ROUTE-02 | Next.js behavior undocumented for two root layouts | Request a nonexistent URL after plan 01-02; if unbranded, STOP and surface to Saeid before any contingency (`experimental.globalNotFound`) |

**Mechanical URL-preservation proof:** diff sorted values of `.next/app-path-routes-manifest.json` before vs after the `(en)` move — empty diff proves all ~284 URLs unchanged.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
