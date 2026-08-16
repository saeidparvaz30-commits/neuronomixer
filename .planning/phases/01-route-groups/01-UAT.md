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
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
