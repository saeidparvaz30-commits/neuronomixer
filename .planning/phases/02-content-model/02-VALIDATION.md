---
phase: 2
slug: content-model
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-20
signed_off: 2026-08-21
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

Shorthands used in the Automated Command column:

- `CHK` = `npx tsx scripts/checks/language-filter.check.ts`
- `CHK --live` = `npx tsx --env-file .env.local scripts/checks/language-filter.check.ts --live`
- `CHK --post-migration` = same with `--post-migration`
- `TSC` = `npx tsc --noEmit`
- `BUILD` = `npx next build` (NEVER `npm run build`)
- `SMOKE` = `node scripts/checks/route-smoke.mjs --verify` against a running `npx next start`

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01 T1 | 02-01 | 1 | CONTENT-02 | T-02-01 | Query module is server-only; no runtime value interpolated into GROQ | tsx script + typecheck | `TSC`; git blob compare against `artifacts/pre-extraction-ref.txt` | `src/sanity/lib/queries.ts`, `artifacts/pre-extraction-ref.txt` | ✅ green |
| 02-01 T2 | 02-01 | 1 | CONTENT-02 | T-02-01 | Post-page and author-page queries relocated byte-faithfully | tsx script + typecheck | `TSC`; assertion E of `CHK` | `src/sanity/lib/queries.ts` | ✅ green |
| 02-01 T3 | 02-01 | 1 | CONTENT-02 | T-02-01, T-02-07 | No inline post GROQ left at any of the 7 call sites | build + smoke | `TSC`; `BUILD`; `SMOKE` (28/28) | 7 call-site files | ✅ green |
| 02-02 T1 | 02-02 | 2 | CONTENT-02 | T-02-01 | `EN_LANGUAGE` interpolated at all 12 read positions, status predicates unaltered | tsx script | `CHK` sections A, B, C | `src/sanity/lib/queries.ts` | ✅ green |
| 02-02 T2 | 02-02 | 2 | CONTENT-02 | T-02-01, T-02-07 | Interpolation allowlist; client components cannot import the query module | tsx script | `CHK` sections D, E, F, G, H | `scripts/checks/language-filter.check.ts` | ✅ green |
| 02-02 T3 | 02-02 | 2 | CONTENT-02 | T-02-01 | Filter is inert against the live dataset; no slug resolves to 2 English posts | live read-only probe | `CHK --live`; `TSC`; `BUILD`; `SMOKE` | `scripts/checks/language-filter.check.ts` | ✅ green |
| 02-03 T1 | 02-03 | 3 | CONTENT-01 | T-02-08, T-02-09 | `translationOf` picker is English-only, self-excluding, `disableNew`; `translationNotes` read-only | tsx script | `CHK` section I | `src/sanity/schemaTypes/postType.ts` | ✅ green |
| 02-03 T2 | 02-03 | 3 | CONTENT-01 | T-02-10 | Both post-creating routes stamp `language: "en"` (initialValue never runs for `client.create`) | tsx script | `CHK` section K | 2 writer routes | ✅ green |
| 02-03 T3 | 02-03 | 3 | CONTENT-01 | T-02-08, T-02-10 | Schema field count tripwire at 17; three new fields present and typed | tsx script + build | `CHK`; `TSC`; `BUILD`; `SMOKE` | `scripts/checks/language-filter.check.ts` | ✅ green |
| 02-04 T1 | 02-04 | 4 | CONTENT-01 | T-02-11, T-02-12 | Dry run is the default; mutation needs explicit `--execute`; patch is `setIfMissing` (idempotent) | tsx script | `TSC`; `CHK --post-migration` verifier mode | `scripts/migrate-post-language.ts` | ✅ green |
| 02-04 T2 | 02-04 | 4 | CONTENT-01 | T-02-11 | Dev dataset stamped 17/17; completeness re-counted by an independent raw-perspective client | live mutation + verifier | `CHK --post-migration` on `blog_posts_dev` → en=17 fa=0 none=0 | `artifacts/migration-dev.log` | ✅ green |
| 02-04 T3 | 02-04 | 4 | CONTENT-01 | T-02-12 | Production run gated on Saeid's explicit in-session go (D-09); dry run reviewed first | manual gate + verifier | `CHK --post-migration` on `blog_posts` → en=26 fa=0 none=0 | `artifacts/migration-prod.log` | ✅ green |
| 02-05 T1 | 02-05 | 5 | CONTENT-01 | T-02-21, T-02-22, T-02-23, T-02-24 | Both filters restate the type clause; distinct ids; explicit apiVersion; no create button on Farsi | tsx script + typecheck | `TSC`; `CHK` section J | `src/sanity/structure.ts` | ✅ green |
| 02-05 T2 | 02-05 | 5 | CONTENT-01 | T-02-21..25, T-02-SC, T-02-DB | Allowlist closed at 3 sanctioned carriers; manifests byte-unchanged; build gate is `npx next build` | tsx script + build + smoke | `CHK`; `CHK --live`; `CHK --post-migration`; `TSC`; `BUILD`; `SMOKE` (28/28) | `scripts/checks/language-filter.check.ts`, this file | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

No row lacks an automated command. The two rows with a manual component (02-04 T3's production go, 02-05 T2's Studio browser pass) each carry an automated verifier alongside the manual step, and both are itemised below.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — `npx tsx` check scripts are authored inside the phase's tasks (read-only GROQ fragment test, schema shape import test, before/after listing parity probe per 02-RESEARCH.md §Validation Architecture).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Studio structure shows two language-filtered lists with correct previews | CONTENT-01 | Sanity Studio is a client application behind auth; no automated harness | Open /studio in dev, confirm "Posts — English" and "Posts — Farsi" lists, Farsi list empty with NO create button, clean devtools console, `translationOf` picker offers English posts only. Full 7-item script: 02-05-PLAN.md Task 2 `<human-check>` | ⏳ **OUTSTANDING** — the executing agent had no browser tooling in its context. Every mechanically checkable part of this row is covered by `CHK` section J (ids, titles, type clauses, apiVersion, create-disabled Farsi list) and by `CHK` section I (picker `disableNew` + resolver filter). What remains genuinely manual is the visual pass and the devtools console. |
| Production migration `--execute` run | CONTENT-01 | Mutates live content; gated on Saeid's explicit go (D-09) | Run dry-run, review report, then re-run with --execute after approval | ✅ **CLOSED** 2026-08-21 — Saeid gave the go in-session; `blog_posts` stamped 26/26, independently re-counted as en=26 fa=0 none=0. Evidence: `artifacts/migration-prod.log` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — every one of the 14 tasks runs at least `npx tsc --noEmit`
- [x] Wave 0 covers all MISSING references — nothing was MISSING; the phase installed no test framework by design
- [x] No watch-mode flags — every command is single-shot; the only long-lived process is the `npx next start` the smoke test targets, and it is not a verifier
- [x] Feedback latency < 180s — `TSC` ~25s, `CHK` <5s, `BUILD` ~110s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** signed off 2026-08-21 at the end of plan 02-05, with one manual row (the Studio browser pass) carried forward as outstanding. It blocks nothing in code: its mechanical content is pinned by section J of the check script, and Phase 3 is the first phase that puts a document in the Farsi list.
