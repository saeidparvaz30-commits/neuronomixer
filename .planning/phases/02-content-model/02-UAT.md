---
status: testing
phase: 02-content-model
source: [02-VERIFICATION.md]
started: 2026-08-21T16:20:00Z
updated: 2026-08-21T16:20:00Z
---

## Current Test

number: 1
name: Studio browser pass (7-item checklist from 02-05-PLAN.md Task 2)
expected: |
  Start `npx next dev`, open `/studio` (needs your Sanity login), then:
  1. Top-level list shows two post lists ("Posts — English", "Posts — Farsi") plus unchanged Categories, Authors, divider, and other document types.
  2. English list shows the existing posts, newest first, subtitles unchanged (author line).
  3. Farsi list is EMPTY and offers NO create button.
  4. Devtools console while switching lists: no custom-filter-missing-apiVersion warning, no duplicate/missing list id error.
  5. Any post shows the three new fields: Language radio defaulting to English, Translation of reference, read-only Translation Notes (cannot be typed into).
  6. Translation of picker offers English posts only, no create-new option, and never offers the open post itself.
  7. No other console errors during the walk.
  Failures on the Farsi list, console, or picker items are plan 02-05 defects; a field-shape failure belongs to plan 02-03.
awaiting: user response

## Tests

### 1. Studio browser pass (7-item checklist from 02-05-PLAN.md Task 2)
expected: Two language-filtered post lists render correctly; Farsi list empty with no create button; console clean; translationOf picker English-only with no self-reference and no create; three new post fields shaped per D-07/D-08.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
