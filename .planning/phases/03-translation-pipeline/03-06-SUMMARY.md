---
phase: 03-translation-pipeline
plan: 06
subsystem: content
tags: [glossary, farsi, human-review, checkpoint, determinism, no-op-diff]

# Dependency graph
requires:
  - phase: 03-translation-pipeline
    plan: 05
    provides: "`content/fa-glossary.json` (98-entry first pass), `content/fa-glossary-review.html`, `scripts/lib/glossary.ts` (loadGlossary, serializeGlossaryBlock) and the `--regen-html` mode of `scripts/mine-glossary-terms.ts`."
provides:
  - "`content/fa-glossary.json` signed off by Saeid with zero corrections. Roadmap success criterion 3 is closed: the file is a Simorgh-drafted first pass reviewed by Saeid, and his verdict is now on the record rather than assumed."
  - "A proven no-op regeneration: `--regen-html` rebuilt the review page from the approved JSON byte for byte, so the JSON and the HTML are demonstrably not drifting rather than merely believed not to be."
  - "The frozen glossary block that plans 03-08 and 03-09 embed verbatim at the top of every translate and verify prompt: 4078 characters over 102 lines."
affects: [03-08, 03-09, 03-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An approval with zero corrections is executed as a literal no-op on the data file. The JSON was never opened for writing, which is what makes the unchanged md5 meaningful evidence instead of a coincidence."
    - "A date-free generated artifact turns regeneration into a falsifiable determinism test: rerunning the emitter and getting an identical md5 proves the emitter is a pure function of the JSON."

key-files:
  created:
    - .planning/phases/03-translation-pipeline/03-06-SUMMARY.md
  modified: []

key-decisions:
  - "Zero corrections were applied because zero were given. The plan's instruction not to pre-empt Saeid's answer by fixing entries that look wrong survives his approval: no entry was touched, not even ones a second pass might have argued about."
  - "No content commit was made. The two content files are byte-identical to their committed state at 0595ebd, so the plan's 'commit touches exactly the two content files' criterion is satisfied vacuously and forcing an empty or cosmetic commit would have been noise in the history."

metrics:
  duration: ~12 min
  completed: 2026-08-25
status: complete
---

# Phase 03 Plan 06: Glossary Human Review Pass Summary

Saeid approved the 98-entry Farsi glossary with zero corrections, so the file was re-proven and left byte-identical rather than edited.

## What This Plan Actually Did

The plan was written to absorb an arbitrary correction list. It received an unconditional approval instead, which turns the whole of Task 2 into a verification exercise: prove the approved file still holds, prove the review page Saeid actually read is the page the JSON generates, and record the glossary block length that every downstream prompt will now carry.

## Task 1: Saeid's Verdict (checkpoint:human-verify, blocking)

Collected 2026-08-25 via AskUserQuestion. The question presented the 98-entry glossary and its strategy split (82 translate, 6 transliterate, 10 keep-english). His answer, verbatim, was the selected option:

> **Glossary approved**

He gave **zero corrections**. No rendering change, no strategy change, no removal, no addition, no term flagged as missing.

Per the plan's own rule, the JSON stayed untouched for the entire duration of the open checkpoint. The pre-approval md5 of `content/fa-glossary.json` is `4c58cee116576ada762e4f5f02d3555a`, and it is still that value now.

## Task 2: Apply, Regenerate, Re-prove

### Corrections applied

None, because none were given. The correction list Task 2 works from is empty. `content/fa-glossary.json` was not opened for writing at any point in this plan.

### Final entry count and strategy distribution

Recounted from the JSON rather than carried forward from the plan text:

| Strategy | Entries |
|---|---|
| translate | 82 |
| transliterate | 6 |
| keep-english | 10 |
| **Total** | **98** |

98 sits inside the required 60 to 100 bound with two entries of headroom.

### Serialized block length

| Measurement | Value |
|---|---|
| Before correction | 4078 chars over 102 lines |
| After correction | 4078 chars over 102 lines |

Before equals after. **No change was expected, because no correction was given.** The plan anticipated a differing block and framed that difference as the visible proof that Saeid's corrections reached the prompt text. With an unconditional approval the inverse holds: an identical block is the correct outcome, and a changed one would have meant something was edited that he did not ask for. Section H of the offline check independently reports the same 4078 characters over 102 lines with 98 entry lines, so the number is confirmed by two separate code paths.

### HTML regeneration

`npx tsx scripts/mine-glossary-terms.ts --regen-html` ran clean:

```
mine-glossary-terms: mode=REGEN-HTML, rebuilt content/fa-glossary-review.html from 98 entries. No model call, no network.
```

The output is **byte-identical** to the file already on disk. The md5 of `content/fa-glossary-review.html` is `fc7a7ea425b8993f04cfee399fbbe59f` both before and after the run, and `git status --short` reports a completely clean tree. There is nothing to commit for the regeneration.

This is worth more than a no-op. It proves the page Saeid read in Chrome is exactly the page the approved JSON emits, so the T-03-25 drift threat is closed by demonstration rather than by assertion.

## Verification Evidence

`npx tsc --noEmit` exited 0 with no output.

`npx tsx scripts/checks/translation.check.ts` exited 0:

```
offline: fixture 14 slot(s) over 10 block(s) (7 span, 5 cell, 1 alt, 1 caption), identity round trip byte identical, fingerprint invariant under full substitution, 6/6 structural mutations detected, unknown _type "code" contributed 0 slots and survived byte identical, count mismatch throws in both directions, notes format pinned (clean line, warn before info, one-lined, no em dash)
offline: glossary 98 entries (translate 82, transliterate 6, keep-english 10), block 4078 chars over 102 line(s) with 98 entry line(s), byte identical across two independent loads, no date, D-04 standing instruction present
translation.check.ts: ALL PASS
```

### Acceptance criteria

| Criterion | Result |
|---|---|
| Every correction present in the JSON | Vacuous, zero corrections given |
| Entry count within 60 to 100 | exit 0 (98) |
| Terms sorted ascending | exit 0 |
| Valid strategy, positive numeric frequency, non-empty example on every entry | exit 0 |
| HTML contains every term in the JSON | exit 0 |
| HTML contains no term absent from the JSON | exit 0, set equality proven both directions (98 term cells parsed from the HTML, empty extra set, empty missing set) |
| `translation.check.ts` prints ALL PASS | confirmed above |
| Commit touches exactly the two content files | satisfied vacuously, both files unchanged from 0595ebd |

The reverse-direction HTML check was not spelled out as a one-liner in the plan, so it was written here: the 98 `class="term"` cells were parsed out of the page, HTML-entity decoded, and compared as a set against the JSON terms. Both the extra set and the missing set are empty.

## Deviations from Plan

### Deviation 1: no content commit

- **Found during:** Task 2
- **Situation:** The plan's action step ends with "Commit both content files together with a message naming the number of corrections applied." With zero corrections applied and a byte-identical HTML regeneration, both files are unchanged from their committed state at `0595ebd`.
- **Resolution:** No content commit was created. A commit naming zero corrections would either have been empty or required an artificial change to the files, and the second option would have violated the plan's own instruction not to edit entries Saeid did not mention.
- **Files modified:** none
- **Commit:** none

This is a documentation deviation, not a correctness one. The state the plan was trying to reach, an approved glossary passing every assertion with the JSON and HTML in agreement, is the state on disk.

### Deviation 2: nothing else

No Rule 1, 2 or 3 auto-fixes were needed. The typecheck and the offline check both passed first time.

## Known Stubs

None. This plan produced no code.

## Threat Flags

None. No new surface: no file written, no network call, no model call, no dependency added.

## Threat Register Outcomes

| Threat ID | Outcome |
|---|---|
| T-03-27 correction transcription drift | Not reachable. There was no correction to transcribe, and the verdict is quoted verbatim above. |
| T-03-24 fabricated frequency on an added term | Not reachable. No term was added, so no frequency was written by hand. |
| T-03-26 corrected file failing validation late | Closed. Section H ran against the approved file and passed before this summary was written. |
| T-03-25 JSON and HTML drifting apart | Closed by demonstration. The regenerated HTML is byte-identical to the reviewed one. |

## What This Unblocks

Plan 03-08 embeds `serializeGlossaryBlock` output at the top of every translate prompt and 03-09 does the same for verify. That block is now frozen at 4078 characters with Saeid's sign-off behind it, which is the precondition the phase needed before spending tokens on real posts. Retranslation risk from a late glossary correction (the key link in this plan's frontmatter) is retired.

## Self-Check: PASSED

- `.planning/phases/03-translation-pipeline/03-06-SUMMARY.md`: FOUND
- `content/fa-glossary.json`: FOUND, md5 `4c58cee116576ada762e4f5f02d3555a`, unchanged
- `content/fa-glossary-review.html`: FOUND, md5 `fc7a7ea425b8993f04cfee399fbbe59f`, unchanged
- Content commits claimed: none, and none exist. Consistent.
