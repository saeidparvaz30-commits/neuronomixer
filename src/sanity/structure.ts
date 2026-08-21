import type { StructureResolver } from "sanity/structure";

import { apiVersion } from "./env";

/**
 * The Studio language predicates.
 *
 * The PUBLIC read predicate lives in `src/sanity/lib/queries.ts` (`EN_LANGUAGE`)
 * and stays the single source of truth for anything a visitor can reach. The two
 * strings below are Studio chrome: editorial list filters executed with the
 * credentials of the signed-in editor, never a read path. The duplication is
 * intentional and does not violate CONTENT-02, and it is pinned by
 * `scripts/checks/language-filter.check.ts` so a third carrier fails the gate.
 *
 * Each filter restates the post type clause on purpose: a custom `.filter()` on a
 * document type list REPLACES the preset `_type == $type` filter rather than
 * appending to it, so dropping the clause would list every document type.
 *
 * English is tolerant (a post with no language value stays visible and editable
 * here rather than disappearing from both lists). Farsi is a plain equality,
 * because Farsi documents are always stamped explicitly by the Phase 3 pipeline.
 */
const EN_LIST_FILTER = `_type == "post" && (!defined(language) || language == "en")`;
const FA_LIST_FILTER = `_type == "post" && language == "fa"`;

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Blog")
    .items([
      S.listItem()
        .id("posts-en")
        .title("Posts — English")
        .schemaType("post")
        .child(
          S.documentTypeList("post")
            .id("posts-en")
            .title("Posts — English")
            .filter(EN_LIST_FILTER)
            .apiVersion(apiVersion)
            .defaultOrdering([{ field: "publishedAt", direction: "desc" }])
        ),
      S.listItem()
        .id("posts-fa")
        .title("Posts — Farsi")
        .schemaType("post")
        .child(
          S.documentTypeList("post")
            .id("posts-fa")
            .title("Posts — Farsi")
            .filter(FA_LIST_FILTER)
            .apiVersion(apiVersion)
            .defaultOrdering([{ field: "publishedAt", direction: "desc" }])
            // Farsi documents come from the Phase 3 pipeline, never from a Studio
            // create button, which would stamp the English initial value.
            .initialValueTemplates([])
        ),
      S.documentTypeListItem("category").title("Categories"),
      S.documentTypeListItem("author").title("Authors"),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => item.getId() && !["post", "category", "author"].includes(item.getId()!)
      ),
    ]);
