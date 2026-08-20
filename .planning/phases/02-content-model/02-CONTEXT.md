# Phase 2: Content Model - Context

**Gathered:** 2026-08-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Sanity models Farsi posts as sibling documents linked to their English source (`language`, `translationOf`, `translationNotes` on `postType`), and all post reads that feed public English surfaces flow through one shared, language-filtered query module (`src/sanity/lib/queries.ts`) with the filter expressed in exactly one place. Includes the one-off migration stamping `language: "en"` on every existing post and the Studio structure split into language-filtered lists. The hard ordering invariant stands: the English-language filter must be live BEFORE the first Farsi document exists.

Out of scope: translation pipeline (Phase 3), Farsi routes/chrome (Phase 4), hreflang/sitemap Farsi URLs (Phase 5), the 151 visual guides (milestone-wide exclusion).

</domain>

<decisions>
## Implementation Decisions

### Filter reach (scope expansion vs roadmap, Saeid-approved 2026-08-20)
- **D-01:** ALL public English surfaces route through the shared filtered query module in this phase, not just the three blog page files. Concretely: `src/app/(en)/blog/page.tsx`, `src/app/(en)/blog/[categorySlug]/page.tsx`, `src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx`, `src/app/(en)/page.tsx` (homepage hero slots + latest posts), `src/app/(en)/authors/[slug]/page.tsx`, `src/app/sitemap.ts`, `src/app/api/v1/posts/route.ts` (feeds the nnx-search MCP index), and `src/app/(en)/review/page.tsx`.
- **D-02:** Dashboards, admin APIs, and the publish-scheduled cron stay DELIBERATELY unfiltered — admins manage both languages. Do not add language filters to `src/app/(en)/dashboard/**`, `src/app/api/dashboard/**`, or `src/app/api/cron/publish-scheduled/route.ts`.

### Filter semantics
- **D-03:** The filter is TOLERANT: `(!defined(language) || language == "en")` — a post without a language field is English. Farsi is always explicit (`language == "fa"` set only by the Phase 3 pipeline), so tolerance carries zero leak risk.
- **D-04:** Belt and braces: every post CREATION path also stamps `language: "en"` on new documents. That means the dashboard/author API routes that create posts in Sanity (locate them during planning — they are the `_type == "post"` writers under `src/app/api/dashboard/`), plus `initialValue: "en"` in the Studio schema per the roadmap.

### Studio split UX
- **D-05:** Two top-level lists in the Studio structure: "Posts — English" and "Posts — Farsi", each language-filtered.
- **D-06:** The Farsi list's preview shows the English source title as subtitle (via `translationOf->title`) so pairs are recognizable at a glance.
- **D-07:** The `translationOf` reference picker is filtered to English posts only (`options.filter` on the reference field).
- **D-08:** `translationNotes` is a read-only text field per the roadmap (populated by the Phase 3 verify pass).

### Migration gate
- **D-09:** The one-off `npx tsx` migration defaults to a DRY-RUN report (count + slugs it would stamp). Mutation runs only with an explicit `--execute` flag, and executing against the production dataset waits for Saeid's explicit go in-session. Patch is `setIfMissing({language: "en"})` — additive, idempotent, re-runnable. No dataset export required.

### Claude's Discretion
- Query module file shape (named exports, `defineQuery` vs plain template strings, param conventions) — planner/researcher decide; the only hard rule is the language filter expressed once (a shared fragment/constant interpolated into every public query).
- Whether `/review?key=` uses the filtered module or is grouped with internal surfaces if research shows it is used to review pending submissions across languages — default is filtered (D-01); adjust with a note if evidence says otherwise.
- Exact Studio structure code layout in `src/sanity/structure.ts`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design spec (milestone-level)
- `C:\Users\saeid\Desktop\Agent Simorgh\projects\2. NeuroNomixer\farsi edition\2026-08-11-farsi-edition-design.md` — approved Farsi-edition design: sibling-document content model, two plain fields (no i18n plugin), slug reuse, pipeline design. (Outside this repo; absolute path intentional.)

### In-repo planning
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, and the strict internal order (extract queries → add filter → schema fields → migration → Studio split).
- `.planning/STATE.md` — blockers/concerns: package-lock broken at HEAD (`npm ci` fails — repair is OUTSIDE this phase), NEVER `npm run build` locally (prisma migrate deploy hits prod DB; gate is `npx next build`), lint gate ON, tsc 0 at every gate.
- `.planning/phases/01-route-groups/01-01-SUMMARY.md` and `01-02-SUMMARY.md` — route-group layout facts ((en)/(fa) structure, gate commands, route smoke tooling).

</canonical_refs>

<code_context>
## Existing Code Insights

### Ground truth from scout (2026-08-20)
- `src/sanity/lib/` currently holds only `client.ts`, `image.ts`, `live.ts` — there is NO `queries.ts` yet; all GROQ is inline at call sites.
- `_type == "post"` GROQ appears in ~22 files. Public surfaces (get the filter): 3 blog pages, `(en)/page.tsx`, `(en)/authors/[slug]/page.tsx`, `(en)/review/page.tsx`, `src/app/sitemap.ts`, `src/app/api/v1/posts/route.ts`. Internal (NO filter): 10 dashboard pages, 5 `api/dashboard/*` routes, `api/cron/publish-scheduled`, `scripts/migrate-post-status.mjs`.
- The blog index query (`src/app/(en)/blog/page.tsx`) is a compound projection (`categories` + `posts` + `authors` in one fetch) with a status filter `(status == "approved" || !defined(status) || (status == "scheduled" && publishedAt <= now()))` — the shared module must preserve these status semantics exactly; only the language clause is new.
- `src/sanity/schemaTypes/postType.ts` has 13 fields today, no language-related fields. `status` uses a 7-value radio list; `submittedBy` is already a `readOnly: true` precedent for `translationNotes`.
- `src/sanity/structure.ts` is the default StructureResolver — the split replaces a near-stock file, low collision risk.
- Precedent for the migration script style: `scripts/migrate-post-status.mjs` (existing one-off Sanity mutation script).

### Established patterns
- Pages fetch with `client.fetch` directly (no sanityFetch/live for these paths); keep that pattern — this phase moves query TEXT, not the fetching mechanism.
- Verification is `npx tsx` check scripts + browser smoke (no test framework, by design). Route smoke tooling from Phase 1 exists and should re-run to prove English URLs unchanged.

### Integration points
- `src/sanity/lib/queries.ts` (new) — single home for public post queries + the one language-filter fragment.
- `src/sanity/schemaTypes/postType.ts` — 3 new fields.
- `src/sanity/structure.ts` — language-split lists.
- Post-creating dashboard API routes — stamp `language: "en"` (D-04).

</code_context>

<specifics>
## Specific Ideas

- Filter fragment expressed ONCE as a shared constant interpolated into every public query — success criterion 2 says "expressed in exactly one place"; treat that literally.
- Farsi list preview: subtitle = English source title (D-06) — Saeid's chosen at-a-glance pairing mechanism.

</specifics>

<deferred>
## Deferred Ideas

- Extending language filtering into dashboards (e.g., a language column/filter in admin post lists) — revisit in Phase 4/5 if managing Farsi drafts in the dashboard gets noisy; deliberately out of scope now (D-02).
- `package-lock.json` repair (`npm ci` broken at HEAD) — pre-existing repo blocker, must be fixed before the next deploy but is NOT part of this phase.
- `/cv/[slug]` unguarded `generateStaticParams` build query — pre-existing, low priority, separate quick task.

</deferred>

---

*Phase: 2-Content Model*
*Context gathered: 2026-08-20*
