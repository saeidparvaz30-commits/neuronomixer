---
phase: 1
slug: route-groups
status: draft
nyquist_compliant: false
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
| (filled by planner) | 01 | 1 | ROUTE-02 | — | N/A | build-gate | `npx tsc --noEmit && npx next build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

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
