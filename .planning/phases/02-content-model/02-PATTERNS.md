# Phase 2: Content Model - Pattern Map

**Mapped:** 2026-08-20
**Files analyzed:** 13 (2 new, 11 modified)
**Analogs found:** 13 / 13

Every file in this phase has a real in-repo analog. There is no greenfield pattern here; even `src/sanity/lib/queries.ts`, which does not exist yet, is populated entirely by query text lifted verbatim from the 8 call sites listed below.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/sanity/lib/queries.ts` (NEW) | utility / query module | transform (string constants, no I/O) | `src/sanity/env.ts` (module of exported consts) + the 8 call sites for content | role-match (structure) + exact (content) |
| `src/app/(en)/blog/page.tsx` | route page | request-response (read) | itself (in-place edit); nearest sibling `src/app/(en)/page.tsx` | exact |
| `src/app/(en)/page.tsx` | route page | request-response (read) | `src/app/(en)/blog/page.tsx` (same compound-object `client.fetch` shape) | exact |
| `src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx` | route page | request-response (read, 3 queries) | `src/app/(en)/authors/[slug]/page.tsx` (same slug+staticParams+metadata triad) | exact |
| `src/app/(en)/authors/[slug]/page.tsx` | route page | request-response (read) | `src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx` | exact |
| `src/app/sitemap.ts` | route handler (metadata) | batch read | `src/app/(en)/blog/page.tsx` (compound `{posts, authors}` fetch) | role-match |
| `src/app/api/v1/posts/route.ts` (GET) | API route | request-response | `src/app/(en)/review/page.tsx` (near-identical query, different projection) | exact |
| `src/app/(en)/review/page.tsx` | route page | request-response | `src/app/api/v1/posts/route.ts` GET | exact |
| `src/sanity/schemaTypes/postType.ts` | schema / model | n/a (declarative) | itself: `status` field (list+radio+initialValue), `submittedBy` (readOnly), `author`/`category` (reference), `preview.prepare` | exact |
| `src/sanity/structure.ts` | config (Studio) | n/a | itself (near-stock default resolver) | role-match |
| `scripts/migrate-post-language.ts` (NEW) | migration script | batch mutation | `scripts/migrate-post-status.mjs` (same shape) + `scripts/link-sanity-author.ts` (TS/env conventions) | exact |
| `scripts/checks/language-filter.check.ts` (NEW) | test / check | batch read + assert | `scripts/checks/shared-pdfs-lib.check.ts` | exact |
| `src/app/api/v1/posts/route.ts` (POST) + `src/app/api/dashboard/author/submit-post/route.ts` | API route (writer) | CRUD create | each other (two shapes of the same `client.create` write) | exact |

---

## Pattern Assignments

### `src/sanity/lib/queries.ts` (NEW — utility, transform)

**Structural analog:** `src/sanity/env.ts` — the repo's only existing "module of exported constants" under `src/sanity/`. Same conventions: no `"use client"`, no side effects, named exports only, no default export.

```typescript
// src/sanity/env.ts:1-12 — the shape to mirror
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-10-07";

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  "Missing environment variable: NEXT_PUBLIC_SANITY_DATASET"
);
```

**Content analog:** the 11 queries listed in RESEARCH.md's inventory. Every one is a plain backtick template literal assigned to a module-level `const` at the top of its call-site file, above the component. That is already the house style — `queries.ts` only relocates it. Examples of the two existing naming conventions:

```typescript
// src/app/(en)/blog/page.tsx:28 and src/app/(en)/page.tsx:24 — anonymous `query`
const query = `{ ... }`;

// src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx:14 — named `postQuery`
const postQuery = ` ... `;
// src/app/(en)/authors/[slug]/page.tsx:10,27 — named `authorQuery`, `postsQuery`
```

Use the **named** convention (`postQuery` / `postsQuery` / `authorQuery`) for the exported constants, since it is already the dominant form in multi-query files and `const query` cannot survive being exported from a shared module.

**Import style at call sites** — all Sanity imports use the `@/` alias:
```typescript
// src/app/(en)/blog/page.tsx:2
import { client } from "@/sanity/lib/client";
```
So call sites become `import { client } from "@/sanity/lib/client";` plus `import { blogIndexQuery } from "@/sanity/lib/queries";`.

**No `defineQuery`, no `groq` tag anywhere in the repo.** Confirmed: every existing query is an untagged template literal. Do not introduce a tag.

**Draft suppression is already free** — do not add draft clauses:
```typescript
// src/sanity/lib/client.ts:5-11 — apiVersion 2025-10-07 => perspective defaults to "published"
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});
```

---

### `src/app/(en)/blog/page.tsx` (route page, request-response)

**Analog:** itself — the edit is extract-and-import, nothing else moves.

**Exact text to move** (lines 28-42), with `${EN_LANGUAGE} &&` inserted after `_type == "post" &&` in the `posts` branch only:

```typescript
const query = `{
  "categories": *[_type == "category" && active == true] | order(order asc) {
    _id, title, slug, description, intuitive
  },
  "posts": *[_type == "post" && (status == "approved" || !defined(status) || (status == "scheduled" && publishedAt <= now()))] | order(featured desc, publishedAt desc) {
    _id, title, slug, description, publishedAt, featured,
    "bodyExcerpt": pt::text(body)[0...300],
    "mainImage": mainImage.asset->url,
    "category": category->{ _id, title, slug },
    "author": author->{ _id, name, slug, "image": image.asset->url, jobTitle }
  },
  "authors": *[_type == "author" && applicationStatus == "approved"] | order(order asc) [0...6] {
    _id, name, slug, "image": image.asset->url, jobTitle
  }
}`;
```

**Fetch pattern to preserve** (lines 52-61) — `client.fetch` is called inside `Promise.all` alongside a Prisma call. Only the first argument changes:

```typescript
const [data, viewCounts] = await Promise.all([
  client.fetch(query),
  prisma.postView.groupBy({ ... }),
]);
```

**Untyped fetch here** (`client.fetch(query)` with no generic, then `data.categories ?? []`). Do not add a generic while extracting — that would change `data`'s inferred type and risk new tsc errors. Keep the call byte-identical apart from the identifier.

---

### `src/app/(en)/page.tsx` (route page, request-response)

**Analog:** `src/app/(en)/blog/page.tsx` — identical compound-object pattern.

**The high-risk excerpt** (lines 24-42). The status predicate appears **four times** and `_type == "post"` appears **four times**, two of them nested inside `count(...)` on a `category` query:

```typescript
const query = `{
  "heroPosts": *[_type == "post" && (status == "approved" || (status == "scheduled" && publishedAt <= now())) && defined(heroOrder)] | order(heroOrder asc) { ... },
  "latestPosts": *[_type == "post" && (status == "approved" || (status == "scheduled" && publishedAt <= now())) && !defined(heroOrder)] | order(publishedAt desc) [0...6] { ... },
  "categories": *[_type == "category" && active == true && count(*[_type == "post" && (status == "approved" || (status == "scheduled" && publishedAt <= now())) && references(^._id)]) > 0] | order(order asc) [0...3] {
    _id, title, slug, description,
    "image": image.asset->url,
    "postCount": count(*[_type == "post" && (status == "approved" || (status == "scheduled" && publishedAt <= now())) && references(^._id)])
  }
}`;
```

Note this is `STATUS_STRICT` (no `!defined(status)` branch) — different from `blog/page.tsx`. Do not unify. All four `_type == "post"` occurrences take `${EN_LANGUAGE}`.

**Route config to leave alone:** `export const revalidate = 30;` (line 44).

---

### `src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx` (route page, request-response)

**Analog:** `src/app/(en)/authors/[slug]/page.tsx` — same three-part structure (module-level query consts, `generateStaticParams`, `generateMetadata`) so mirror how that file will be edited.

**Three separate queries in this file, three different status predicates:**

```typescript
// L14-35 — APPROVED-ONLY, single-document [0]. Highest-risk query in the phase.
const postQuery = `
  *[_type == "post" && slug.current == $slug && status == "approved"][0]{ ... }
`;

// L36-44 — APPROVED-ONLY + defined() guards, inline in generateStaticParams
export async function generateStaticParams() {
  const posts = await client.fetch<{ categorySlug: string; slug: string }[]>(
    `*[_type == "post" && status == "approved" && defined(slug.current) && defined(category->slug.current)]{
      "categorySlug": category->slug.current,
      "slug": slug.current
    }`
  );
  return posts.map((p) => ({ categorySlug: p.categorySlug, postSlug: p.slug }));
}

// L53-65 — NO status predicate at all, inline in generateMetadata
const post = await client.fetch(
  `*[_type == "post" && slug.current == $slug][0]{ ... }`,
  { slug: postSlug }
);
```

**Typed-fetch pattern to copy for extracted queries that already have a generic** (L37): `client.fetch<T[]>(queryConst)` — keep the generic on the call site, do not move typing into `queries.ts`.

**Param pattern:** `{ slug: postSlug }` as the second argument. All runtime values are already `$params` in this repo. Preserve that; `EN_LANGUAGE` is the only interpolated value ever added.

---

### `src/app/(en)/authors/[slug]/page.tsx` (route page, request-response)

**Analog:** the post page above.

**The one post query** (L27-38), TOLERANT status + author join:

```typescript
const postsQuery = `
  *[_type == "post" && (status == "approved" || !defined(status) || (status == "scheduled" && publishedAt <= now())) && author->slug.current == $slug]
  | order(publishedAt desc) [0...20] {
    _id,
    title,
    slug,
    publishedAt,
    description,
    mainImage { asset->{ url } },
    "category": category->{ title, slug }
  }
`;
```

`authorQuery` (L10-25) is `_type == "author"` — leave it entirely alone, it does not move to `queries.ts` (the module is for post queries).

---

### `src/app/sitemap.ts` (route handler, batch read)

**Analog:** `src/app/(en)/blog/page.tsx` compound fetch — but here the fetch is typed and inline in the function body rather than a module-level const.

```typescript
// src/app/sitemap.ts:23-44
const data = await client.fetch<{
  posts: PostItem[];
  authors: AuthorItem[];
}>(
  `{
    "posts": *[
      _type == "post" &&
      defined(slug.current) &&
      defined(category->slug.current) &&
      category->active == true
    ]{
      "slug": slug.current,
      "categorySlug": category->slug.current,
      _updatedAt,
      _createdAt
    },
    "authors": *[_type == "author" && applicationStatus == "approved" && defined(slug.current)]{
      "slug": slug.current,
      _updatedAt
    }
  }`
);
```

Multi-line `*[ ... ]` formatting here differs from the one-liners elsewhere. Preserve it verbatim when moving; insert `${EN_LANGUAGE} &&` on its own line after `_type == "post" &&`. **No status predicate — do not add one** (pre-existing SEO bug, explicitly out of scope).

**Graceful-degradation pattern in the same file** (L49-55) is worth noting as the file's local convention but is Prisma-side and unchanged:
```typescript
try {
  guides = await prisma.visualGuide.findMany({ ... });
} catch {
  // DB unavailable: ship the sitemap without guide URLs rather than failing it
}
```

---

### `src/app/api/v1/posts/route.ts` GET + `src/app/(en)/review/page.tsx` (API route / page, request-response)

**Analog:** each other. Near-identical queries, deliberately NOT merged (projections differ).

```typescript
// api/v1/posts/route.ts:52-74 — has "url": select(...) and takes $siteUrl
const raw = await client.fetch<SanityPostListItem[]>(
  `*[_type == "post" && author._ref == $authorId] | order(coalesce(publishedAt, _createdAt) desc) {
    "id": _id, title, "slug": slug.current, description, status, publishedAt, _createdAt,
    "mainImage": mainImage.asset->url,
    "category": category->{ title, "slug": slug.current },
    "url": select(
      defined(category) => $siteUrl + "/blog/" + category->slug.current + "/" + slug.current,
      null
    ),
    body[]{ ... }
  }`,
  { authorId: user.sanityAuthorId, siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "" }
);

// (en)/review/page.tsx:71-89 — same filter, NO url projection, builds URL in TS instead
const raw = await client.fetch<SanityPostListItem[]>(
  `*[_type == "post" && author._ref == $authorId] | order(coalesce(publishedAt, _createdAt) desc) { ... }`,
  { authorId: sanityAuthorId }
);
```

Export as two constants. Both get `${EN_LANGUAGE}` after `_type == "post"`. Both keep the `SanityPostListItem[]` generic at the call site.

---

### `src/sanity/schemaTypes/postType.ts` (schema, declarative)

**Analog:** itself. Every one of the three new fields has an exact in-file precedent.

**`language` — copy `status` (L88-105):**
```typescript
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          ...
        ],
        layout: "radio",
      },
      initialValue: "draft",
    }),
```

**`translationNotes` — copy `submittedBy` (L106-112), the readOnly precedent:**
```typescript
    defineField({
      name: "submittedBy",
      title: "Submitted By (User ID)",
      type: "string",
      readOnly: true,
      description: "The Prisma User ID of the author who submitted this post.",
    }),
```
Combine with the `rows`-carrying text precedent, `description` (L73-79): `type: "text", rows: 2`.

**`translationOf` — copy the `category` reference (L21-26):**
```typescript
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
    }),
```
Note the file has **both** array and object `to:` forms (`category` uses `to: [{...}]`, `author` L54-58 uses `to: { type: "author" }`). Use the array form. `options.filter` / `disableNew` have no in-repo precedent — take them from RESEARCH.md's verified code example.

**Preview — the existing `prepare` spreads `selection`, which the D-06 change must not break (L122-132):**
```typescript
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "mainImage",
    },
    prepare(selection) {
      const { author } = selection;
      return { ...selection, subtitle: author && `by ${author}` };
    },
  },
```
The `author: "author.name"` dot-path is the exact precedent for D-06's `sourceTitle: "translationOf.title"`. Note the current `{ ...selection }` spread: RESEARCH.md's replacement destructures explicitly instead, which is the safer form once extra `select` keys (`language`, `sourceTitle`) exist that must not leak into the preview return object.

**File conventions:** `defineType` + `defineField` from `"sanity"`, icon from `"@sanity/icons"`, double-quoted strings, 2-space indent, trailing commas.

---

### `src/sanity/structure.ts` (config)

**Analog:** itself — the current file is 15 lines of near-stock resolver. Note it is the one file in `src/sanity/` using **single quotes and no semicolons** (Sanity CLI boilerplate style). Prettier/ESLint have tolerated it; either keep that style for a minimal diff or convert the whole file consistently. Do not mix.

```typescript
// current full file
import type {StructureResolver} from 'sanity/structure'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Blog')
    .items([
      S.documentTypeListItem('post').title('Posts'),
      S.documentTypeListItem('category').title('Categories'),
      S.documentTypeListItem('author').title('Authors'),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => item.getId() && !['post', 'category', 'author'].includes(item.getId()!),
      ),
    ])
```

Line 8 (`S.documentTypeListItem('post')`) is what the two split list items replace. The trailing `documentTypeListItems().filter(...)` spread on L12-14 already excludes `post`, so it needs no change. `apiVersion` comes from `./env` (`src/sanity/env.ts:1-2`) — a relative import, matching how `src/sanity/lib/client.ts:3` does `from "../env"`.

---

### `scripts/migrate-post-language.ts` (NEW — migration script, batch mutation)

**Primary analog:** `scripts/migrate-post-status.mjs` — same job (stamp a missing field on all posts), one generation older.

```javascript
// scripts/migrate-post-status.mjs — full pattern: header comment with run command,
// createClient, fetch !defined(field), early-exit on empty, loop-patch, done log
/**
 * One-time migration: set status = "approved" on all posts that have no status.
 * Run with: node scripts/migrate-post-status.mjs
 */
const posts = await client.fetch(
  `*[_type == "post" && !defined(status)]{ _id, title }`
);

if (posts.length === 0) {
  console.log("No posts need updating.");
  process.exit(0);
}

console.log(`Found ${posts.length} posts without status. Setting to "approved"...`);

for (const post of posts) {
  await client.patch(post._id).set({ status: "approved" }).commit();
  console.log(`  ✓ ${post.title}`);
}
```

**Do NOT copy its env loading** (L7-12): it imports `dotenv`, which is undeclared in `package.json`.

**Secondary analog for TS + env conventions:** `scripts/link-sanity-author.ts` — the newer, strict-clean pattern to actually follow:

```typescript
/**
 * One-time script: links an existing Sanity author document to a Prisma user.
 * Run with:  npx tsx --env-file .env.local scripts/link-sanity-author.ts
 */
import { createClient } from "@sanity/client";

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token:     process.env.SANITY_API_TOKEN,
  useCdn:    false,
});

async function main() { ... }

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => process.exit(0));
```

Copy: the header docblock carrying the literal run command, `createClient` from `@sanity/client` (not `next-sanity`), non-null assertion `!` on required env vars (this is how the repo stays strict-clean under `npx tsc --noEmit`), typed `client.fetch<T[]>` with an inline row type, `main()` + `.catch(err => { console.error(err); process.exit(1); })`.

Deviate on: `apiVersion` should come from `process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07"` rather than the stale hardcoded `"2024-01-01"`; add `perspective: "raw"`; and `dataset` must NOT default to `"production"` (that string is not a real dataset here — the datasets are `blog_posts` and `blog_posts_dev`; a silent fallback is exactly Pitfall 6). Use `process.env.NEXT_PUBLIC_SANITY_DATASET!` with no fallback.

---

### `scripts/checks/language-filter.check.ts` (NEW — check script)

**Analog:** `scripts/checks/shared-pdfs-lib.check.ts` — the repo's only `.check.ts`, and the template for the no-test-framework verification convention.

```typescript
/**
 * Logic checks for src/lib/sharedPdfs.ts. Run: npx tsx scripts/checks/shared-pdfs-lib.check.ts
 * DB-free: only pure helpers are checked here; getActiveShare is exercised in manual verification.
 */
import assert from "node:assert";
import { generateShareToken, slugifyFilename } from "../../src/lib/sharedPdfs";

assert.strictEqual(t.length, 22, `token length ${t.length}`);
assert.match(t, /^[A-Za-z0-9_-]+$/, `token alphabet: ${t}`);
assert.strictEqual(tokens.size, 1000, "tokens must not collide in 1000 draws");

console.log("shared-pdfs-lib.check.ts: ALL PASS");
```

Copy exactly: docblock with the literal `npx tsx` run command on line 2, `import assert from "node:assert"`, **relative** `../../src/...` imports (the `@/` alias is not available to `tsx`-run scripts), top-level assertions with a message as the third arg, and the terminal `console.log("<filename>: ALL PASS")`. Top-level `await` is fine (`migrate-post-status.mjs` uses it).

This check needs env (it queries the live dataset), so its run command is `npx tsx --env-file .env.local scripts/checks/language-filter.check.ts`, unlike the DB-free analog.

---

### Post-creation writers (D-04) — two distinct create shapes

**`src/app/api/v1/posts/route.ts` L175-195 — object literal passed straight to `client.create`, fully typed, no cast:**
```typescript
const doc = await client.create({
  _type: "post",
  title,
  description,
  ...(metaDesc && { metaDescription: metaDesc.slice(0, 160) }),
  slug: { _type: "slug", current: title.toLowerCase()... },
  author: { _type: "reference", _ref: user.sanityAuthorId },
  category: { _type: "reference", _ref: category._id },
  ...(mainImageAsset ? { mainImage: mainImageAsset } : {}),
  body: portableBody,
  status: "pending",
  submittedBy: user.userId,
  publishedAt: publishedAt || new Date().toISOString(),
});
```
Add `language: "en",` adjacent to `status: "pending",` — grouping the two document-classification fields together.

**`src/app/api/dashboard/author/submit-post/route.ts` L72-98 — `Record<string, unknown>` built up, then cast:**
```typescript
const doc: Record<string, unknown> = {
  _type: "post",
  title: title.trim(),
  slug: { _type: "slug", current: slug },
  status: action === "draft" ? "draft" : "pending",
  submittedBy: userId,
  ...
};

let created: { _id: string };
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  created = await client.create(doc as any);
} catch (err) {
  console.error("[submit-post] Sanity create error:", err);
  return NextResponse.json({ error: "Failed to save to Sanity. Please try again." }, { status: 500 });
}
```
Add `language: "en",` to the object literal, again next to `status`. Do not touch the `as any` cast or its eslint-disable — it is load-bearing for the lint gate.

**Note the divergent error handling between the two writers** — `api/v1` lets `client.create` throw (no try/catch), `submit-post` wraps it and logs with a `[submit-post]` prefix. Neither changes; adding a field cannot introduce a new failure mode.

---

## Shared Patterns

### The one language fragment (CONTENT-02)
**Source:** none yet — this is the phase's only genuinely new construct.
**Apply to:** all 11 queries, 12 interpolation sites.
```typescript
// src/sanity/lib/queries.ts
export const EN_LANGUAGE = `(!defined(language) || language == "en")`;
```
Placement convention to adopt uniformly: immediately after `_type == "post" &&`, before the status predicate. This makes `grep -c EN_LANGUAGE src/sanity/lib/queries.ts` a meaningful completeness assertion (must equal 12 + 1 declaration).

### Sanity read client
**Source:** `src/sanity/lib/client.ts:1-11`
**Apply to:** every read call site (unchanged, all 8 already import it).
```typescript
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../env";

export const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token: process.env.SANITY_API_TOKEN });
```
App code uses `next-sanity`'s `createClient`; standalone scripts use `@sanity/client` directly. Keep that split.

### Import aliasing
**Source:** every file under `src/app/`
**Apply to:** all modified call sites.
`@/sanity/lib/...`, `@/lib/prisma`, `@/components/...`. Scripts under `scripts/` use relative paths instead (`../../src/lib/...`) because they run outside Next's alias resolution.

### Module-level query constants above the component
**Source:** `src/app/(en)/authors/[slug]/page.tsx:10-38`, `blog/[categorySlug]/[postSlug]/page.tsx:14-35`
**Apply to:** the shape of `queries.ts`, and to what gets deleted from each call site. After extraction, each page keeps its imports, its `metadata`/`revalidate` exports, and its component — the query const block is simply replaced by one import line.

### Script header docblock carrying the run command
**Source:** `scripts/link-sanity-author.ts:1-4`, `scripts/checks/shared-pdfs-lib.check.ts:1-4`, `scripts/migrate-post-status.mjs:1-4`
**Apply to:** both new scripts. Universal in this repo — every script's first lines state exactly how to invoke it. For the migration, state all three invocations (dry dev, execute dev, execute prod).

### Strict-clean env access in scripts
**Source:** `scripts/link-sanity-author.ts:14-19`
**Apply to:** `scripts/migrate-post-language.ts`, `scripts/checks/language-filter.check.ts`
Non-null assertion (`process.env.X!`) is the established way this repo satisfies `strict` for env vars in scripts. `tsconfig.json` includes `**/*.ts`, so both new scripts are typechecked by the gate.

---

## No Analog Found

| File / construct | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `options.filter` resolver + `disableNew` on `translationOf` | schema | n/a | No reference field in the repo uses `options` at all. Use RESEARCH.md's verified example (validated against installed `@sanity/types`). |
| `.filter()` / `.apiVersion()` / `.initialValueTemplates([])` on `documentTypeList` | config | n/a | `structure.ts` is stock; no custom-filtered list exists. Use RESEARCH.md's verified example. |
| `commit({ dryRun: true })` | migration script | batch mutation | `migrate-post-status.mjs` commits unconditionally; no dry-run precedent in the repo. Use RESEARCH.md's example. |
| `client.transaction()` | migration script | batch mutation | Both existing scripts loop single `.patch().commit()` calls. The loop form is an acceptable fallback at 17/26 documents if the transaction form causes friction. |

---

## Metadata

**Analog search scope:** `src/sanity/**`, `src/app/(en)/**`, `src/app/api/**`, `src/app/sitemap.ts`, `scripts/**`
**Files read this pass:** 15
**Pattern extraction date:** 2026-08-20
