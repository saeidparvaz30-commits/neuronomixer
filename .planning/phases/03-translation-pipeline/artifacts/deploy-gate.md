# D-11 Deploy Gate

Phase 3, plan 03-04. This artifact is the evidence pack for the push of `main` and the
production deploy that D-11 step 2 requires, plus the proof afterwards that the Phase 2
English-language filter and the 18-field post schema are live on production.

Assembled 2026-08-22. Nothing has been pushed and nothing has been deployed at the time
the Pre-push section was written.

No environment value, credential or connection string appears anywhere in this file.

---

## Pre-push

Working tree state at the time of capture: `HEAD` = `d0b568668b1b6ff0bcf9e87035ddcd65757edce8`,
branch `main`, `origin/main` = `5ea9ddb8cf000a8eed7d65869d352e11133e6ee4`.

### 1. `git status --short`

```
```

Empty. No staged content, no working-tree modification, no untracked file.

Independently asserted for T-03-04, because an empty status alone does not prove a secret
is not already committed somewhere in the 79 commits:

| Assertion | Command | Result |
|---|---|---|
| No `.env` path in the outgoing diff | `git diff --name-only origin/main..main \| grep -i "\.env"` | 0 matches |
| No `.env` file tracked anywhere in the repo | `git ls-files \| grep -i "^\.env\|/\.env"` | 0 matches |
| All three env files ignored | `git check-ignore -v .env .env.local .env.vercel-prod` | all three matched by `.gitignore:60:.env*` |

### 2. `git log --oneline origin/main..main | wc -l`

```
79
```

`git rev-list --count origin/main..main` returns the same `79`.

The plan anticipated "roughly sixty". The real number is **79**. The gap is not a surprise
finding, it is the four Phase 3 plans (03-01, 03-02, 03-03, 03-07) that were executed after
the plan was written, plus the phase's own planning documents.

Breakdown by commit scope, so the number can be checked against expectation rather than
taken on trust:

| Scope | Commits |
|---|---|
| Phase 1 (route groups) | 22 |
| Phase 2 (content model) | 29 |
| Phase 3 (translation pipeline) | 22 |
| Project setup, roadmap, state sessions | 6 |
| **Total** | **79** |

The six unscoped commits are `docs: initialize project`, `docs: map existing codebase`,
`chore: add project config`, `docs: create Farsi edition roadmap`, and the two
`docs(state): record phase N context session` entries.

`git diff --stat origin/main..main` totals **334 files changed, 23380 insertions(+), 189 deletions(-)**.

### 3. `git log --oneline origin/main..main | head -20`

```
d0b5686 docs(03-07): complete the pipeline CLI, selection and dry-run plan
7d9d9f3 feat(03-07): enumerate translatables, estimate cost and prove write scope in a dry run
7e89652 feat(03-07): select posts under the raw perspective and report D-08 staleness
e19cce3 feat(03-07): add the translation CLI surface, dataset-safe client and loud header
f18fcc4 docs(03-03): complete the pipeline correctness core plan
b87d76b test(03-03): prove the walker, the fingerprint gate and the notes formatter
b4c7f1d feat(03-03): add the translationNotes formatter with an explicit clean line
6f246ee feat(03-03): add the Portable Text translation walker and structural fingerprint
67cbe22 docs(03-02): complete the Sanity pipeline surfaces plan
f6acaf8 test(03-02): pin the pipeline queries offline and prove them live
1bb12be feat(03-02): add the pipeline selection and staleness queries to queries.ts
393a284 feat(03-02): add sourceUpdatedAt to postType and move the field tripwire to 18
35b7bdc docs(03-01): complete Wave 0 preconditions plan
27f864e feat(03-01): add env-preflight check and record the A2/A3/A4 answers
56dc9a4 feat(03-01): add scripts/lib/token-usage.ts for CLI spend recording
eb58469 fix(03-01): repair package-lock.json so npm ci is green again
00964c5 docs(03): create phase plan
ec1eb6c docs(03): move glossary HTML regeneration into plan 03-05 so 03-06 owns only the content files
294589b docs(03): plan the translation pipeline phase (10 plans, 6 waves)
2213608 docs(03): add validation strategy + post-research decisions D-13..D-15
```

### 4. `npm ci --dry-run --ignore-scripts`

**Exit 0.**

```
added 406 packages, removed 210 packages, and changed 562 packages in 2s

376 packages are looking for funding
  run `npm fund` for details
```

`EUSAGE` occurrences in the full output: **0**. This is the property that matters. `npm ci`
fails with `EUSAGE` when the lockfile disagrees with `package.json`, and that is the failure
plan 03-01 repaired in `eb58469`. It is green.

The `removed 210 / changed 562` numbers are the diff between the lockfile and the currently
installed `node_modules` tree, not a lockfile defect. That local tree carries the hybrid
npm/pnpm residue plan 01-01 untangled. Vercel installs from a clean cache, so it sees only
the `added 406`.

### 5. `npx tsc --noEmit`

**Exit 0.** No output.

### 6. `npx eslint`

**Exit 0.**

```
✖ 104 problems (0 errors, 104 warnings)
  0 errors and 12 warnings potentially fixable with the `--fix` option.
```

**0 errors.** The 104 warnings are all `@typescript-eslint/no-unused-vars`, all pre-existing,
and all in `src/components/VisualGuides/**` plus one in `blockContentType.ts`. None sits in a
file this milestone touched. They are out of scope for this gate and were not fixed.

### 7. `npx next build`

**Exit 0.** Full route table produced, static and SSG pages prerendered, middleware emitted at
86.7 kB, shared first-load JS 103 kB.

This is the local build gate. `npm run build` was **not** run and must never be run locally:
that script is `prisma generate && prisma migrate deploy && next build`, and the Prisma CLI
reads `.env`, which points at the production database.

Related finding, checked because Vercel's own Build Command is `npm run build` and therefore
*does* run `prisma migrate deploy` against production on this deploy:

```
git diff --name-only origin/main..main | grep -i "prisma"   ->   0 matches
```

**No Prisma schema and no migration file changes in the 79 commits.** `prisma migrate deploy`
on Vercel will be a no-op against the production database. This deploy carries no schema
migration.

### 8. `node scripts/checks/route-smoke.mjs --verify`

**Exit 0.**

```
28/28 passed
route-smoke.mjs: ALL PASS
```

Run against a backgrounded `npx next start` in production mode. See the Deviations section
below: the server was started on port 3100 with `GATE_BASE_URL=http://localhost:3100`, because
an unrelated process was already listening on port 3000 and was deliberately left alone.

### 9. `npx tsx scripts/checks/language-filter.check.ts` (offline)

**Exit 0.**

```
offline: fragment identity OK, 12 interpolations across 9 queries, status predicates intact,
24 interpolations all allowlisted, 9/9 faithful to 293616f, 7 call sites free of inline GROQ,
1184 src files scanned, sole carrier src/sanity/lib/queries.ts,
src/sanity/schemaTypes/postType.ts, src/sanity/structure.ts, 18 schema fields with
language/translationOf/translationNotes intact, Studio split pinned (posts-en + posts-fa,
2 type clauses, 2 apiVersion calls, 1 create-disabled list), 2/2 post writers stamping
language, 2 pipeline selection queries pinned (PIPE-01)
language-filter.check.ts: ALL PASS
```

### 10. `npx tsx --env-file .env.vercel-prod scripts/checks/language-filter.check.ts --live`

**Exit 0.** Run against the production dataset.

```
live: projectId=pz9ppas8 dataset=blog_posts apiVersion=2025-10-07 posts=26
  fragment behaviour: kept ["en","none"], dropped "fa"
  parity blogIndexQuery: identical, 26 row(s)
  parity homePageQuery: identical, 9 row(s)
  parity postBySlugQuery: identical, 1 row(s)
  parity postStaticParamsQuery: identical, 26 row(s)
  parity postMetadataBySlugQuery: identical, 1 row(s)
  parity postsByAuthorSlugQuery: identical, 20 row(s)
  parity sitemapQuery: identical, 26 row(s)
  parity postsByAuthorIdQuery: identical, 26 row(s)
  parity authorReviewPostsQuery: identical, 26 row(s)
  slug uniqueness: 26 distinct slug(s), max 1 English match each, 0 with zero English matches
  pipeline selection: dataset=blog_posts (raw perspective) approved-english=26 candidates=26 stale=0
  pipeline $slug path: slug="the-modern-data-career-map" narrowed 26 row(s) to 1
language-filter.check.ts: ALL PASS
```

Note what "parity identical" means here and why it is not a contradiction. The filter is live
in the **code** being deployed, and against today's production data the filtered and unfiltered
queries return the same rows, because production holds zero Farsi documents. That is exactly
the ordering invariant: the filter must be provably present before the data can make it matter.

### 11. `npx tsx scripts/checks/translation.check.ts`

**Exit 0.**

```
offline: fixture 14 slot(s) over 10 block(s) (7 span, 5 cell, 1 alt, 1 caption), identity round
trip byte identical, fingerprint invariant under full substitution, 6/6 structural mutations
detected, unknown _type "code" contributed 0 slots and survived byte identical, count mismatch
throws in both directions, notes format pinned (clean line, warn before info, one-lined, no em dash)
translation.check.ts: ALL PASS
```

---

## Production branch finding

**The Vercel production branch is `main`.** This was determined from the Vercel CLI, which is
authenticated (`npx vercel whoami` returns `saeidparvaz30-9254`), so it does not need to be
answered by Saeid at the checkpoint. Two independent signals agree:

**Signal 1, the alias set on the current production deployment.** `npx vercel inspect` on the
newest deployment with `target production` (`dpl_Gw9Vs8x9FuJWuvMbg3rmuhERjz3d`) lists among its
aliases:

```
https://neuro-nomixer-git-main-saeids-projects-69fd119a.vercel.app
https://www.neuronomixer.com
https://neuronomixer.com
```

The `-git-main-` alias is Vercel's per-branch alias, and it is attached to the deployment that
also carries the apex domain. That is only true of the production branch.

**Signal 2, the timestamps.** The current production deployment was created
`Wed Jul 22 2026 22:21:44 GMT+0200`. The tip of `origin/main` (`5ea9ddb`) was committed
`2026-07-22 22:21:39 +0200`. Five seconds apart. A push to `main` triggered that production build.

Corollary worth stating plainly: **production has not been redeployed since 2026-07-22**, which
is why the Phase 2 filter is not live yet despite being committed. That is the whole reason this
gate exists.

Project identity, for the record: project `neuro-nomixer`, id `prj_Fr0H60M7yprN3yzLPefxapJLwBFI`,
org `saeids-projects-69fd119a`, framework preset Next.js, Node 22.x, root directory `.`.

---

## Ordering-invariant baseline: production Farsi document count

Counted under a **raw-perspective** client against `.env.vercel-prod`, because raw is the only
perspective that can see `drafts.*` documents. A published-perspective count would miss exactly
the Farsi drafts this pipeline is going to create.

```
raw-perspective count | dataset=blog_posts apiVersion=2025-10-07
  posts total : 26
  language en : 26
  language fa : 0
  no language : 0
```

**Production Farsi document count: 0.**

Also worth recording: `no language: 0`. Every one of the 26 production posts carries an explicit
`language` stamp, so the filter's `["en", "none"]` fragment has no unstamped documents to fall
back on. The Phase 2 migration is fully applied to the production data.

This is the number plan 03-10 will move off zero, and it must still read 0 immediately after the
deploy for the invariant to have held.

---

## Deviations recorded during evidence gathering

**1. Route smoke ran on port 3100, not the default 3000.** An unrelated process (PID 33340) was
already listening on port 3000 when the gate started. Rather than kill a process this plan does
not own, `npx next start -p 3100` was used with `GATE_BASE_URL=http://localhost:3100`, which is
the override the smoke script documents. The server was stopped after the run. The check is
unchanged: the same 28 URLs against the same production-mode build.

**2. The commit count is 79, not the roughly sixty the plan anticipated.** Recorded rather than
reconciled, with the scope breakdown above so the number can be checked.

**3. `npx eslint` is not literally silent.** It exits 0 with 0 errors and 104 pre-existing
warnings. The plan's "clean" is read as exit 0 with zero errors. The warnings were not touched,
because none is in a file this milestone changed.

---

## What the push will do

For the checkpoint, stated once and plainly:

| Effect | Detail |
|---|---|
| Commits crossing to the remote | 79, across 334 files |
| Production deployment | Triggered automatically by the push to `main` |
| Schema migration on production DB | None. Zero Prisma changes in the 79 commits, so `prisma migrate deploy` is a no-op |
| Route-group move (Phase 1) | 284 English URLs, verified byte-identical at plan time, 28/28 smoke now |
| English-language filter (Phase 2) | Becomes live on the regenerated static build. This is the point of the gate |
| Studio split (Phase 2) | `posts-en` and `posts-fa` panes replace the single post list |
| `sourceUpdatedAt` field (Phase 3) | Post schema goes 17 fields to 18, hidden on English documents |
| Lockfile (plan 03-01) | Vercel installs the repaired `package-lock.json` for the first time |
| Farsi content | None. Zero Farsi documents exist on production and none is created by this deploy |

### T-03-11: the three `too-new` package verdicts

The research audit flagged `@sanity/client` 7.26.2, `get-it` 8.8.3 and `nanoid` 3.3.18 as SUS on
a `too-new` signal, which fires on the most recent publish date and not on package age. All three
are first-party, repo-backed, already installed, already serving production traffic today, carry
no install script, and have between 1.7 and 238 million weekly downloads. They are patch and minor
bumps of packages the site already runs, not new dependencies.

The evidence that they did not regress anything is this gate rather than three separate registry
walkthroughs: `npm ci --dry-run` exit 0 with zero removals, `npx tsc --noEmit` exit 0,
`npx next build` exit 0, route smoke 28/28, and after the deploy a live production `/blog` fetch.

---

## Authorisation

Given 2026-08-23, in session, at the Task 2 checkpoint. Saeid selected:

> "Approved — push main"

from the checkpoint question "Authorize the push of main (80 commits) to origin and the
resulting production deploy?". The branch named and confirmed is `main`, matching the
production-branch finding above. The T-03-11 framing (this deploy as the evidence pass for
the three too-new package verdicts) was presented in the same checkpoint and accepted with
the approval.

Note: the count at approval time is **80** commits, not the 79 captured in the Pre-push
section — the one additional commit is `03a0dc0 docs(03-04): assemble the D-11 pre-push
evidence pack`, this artifact itself. No source file changed after evidence capture.

<!-- The Post-deploy section is written by Task 3, after the deploy reaches a ready state. -->
