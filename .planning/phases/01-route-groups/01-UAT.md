---
status: testing
phase: 01-route-groups
source: [01-VERIFICATION.md]
started: 2026-08-16T22:30:00Z
updated: 2026-08-16T22:30:00Z
---

## Current Test

number: 1
name: Authenticated dashboard chunk-load check
expected: |
  Signed in, /dashboard/author/posts/<id>/edit loads its lazy next/dynamic
  submit-form chunk with no console error; the two admin re-export routes
  (/dashboard/admin/api-key, /dashboard/admin/suggest-category) render.
awaiting: user response

## Tests

### 1. Authenticated dashboard chunk-load check
expected: Signed in, /dashboard/author/posts/<id>/edit renders the submit form with no chunk-load console error; admin re-export routes spot-checked.
result: [pending]

### 2. Visual /fa and 404 confirmation
expected: /fa renders styled and right-to-left with Farsi text; / unchanged with nav and footer; a nonsense URL shows the branded 404 (known: no nav/footer on the global 404 by design).
result: passed - verified 2026-08-16 in Saeid's Chrome against npx next start -p 3100: /fa dark-themed, gold Farsi title, RTL text, Farsi tab title; / unchanged (nav, logo, hero); /this-page-does-not-exist-xyz shows branded gold 404 with CTAs and "Page not found | NeuroNomixer" title. Bonus: /dashboard/author/posts correctly auth-redirects to /auth/sign-in post-move.

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
