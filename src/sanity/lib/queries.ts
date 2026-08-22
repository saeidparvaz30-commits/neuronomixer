/**
 * The only home for public post GROQ.
 *
 * Server-only. These constants are consumed by server components, route handlers
 * and metadata routes. Never import this module from a client component.
 *
 * The status predicates below are FOUR deliberate variants lifted verbatim from
 * the call sites: tolerant, strict, approved-only, and none-at-all (three of the
 * nine queries carry no status predicate). They must not be unified. Normalising
 * them would silently change what the public site publishes.
 */

// The ONE place the English-language predicate is expressed (CONTENT-02).
// Nothing else under src/ may carry this text. Plan 02-05 adds a second,
// deliberate occurrence in src/sanity/structure.ts for Studio chrome only.
//
// Tolerant by decision D-03: a post with no language field IS English. Farsi is
// always explicit (language == "fa", stamped only by the Phase 3 pipeline), so
// tolerance carries no leak risk.
//
// The Farsi counterpart is deliberately NOT defined here yet. Phase 4 adds it as
// a sibling one-liner; declaring it now would be dead code.
export const EN_LANGUAGE = `(!defined(language) || language == "en")`;

export const STATUS_TOLERANT = `(status == "approved" || !defined(status) || (status == "scheduled" && publishedAt <= now()))`;

export const STATUS_STRICT = `(status == "approved" || (status == "scheduled" && publishedAt <= now()))`;

export const STATUS_APPROVED = `status == "approved"`;

export const blogIndexQuery = `{
  "categories": *[_type == "category" && active == true] | order(order asc) {
    _id, title, slug, description, intuitive
  },
  "posts": *[_type == "post" && ${EN_LANGUAGE} && ${STATUS_TOLERANT}] | order(featured desc, publishedAt desc) {
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

export const homePageQuery = `{
  "heroPosts": *[_type == "post" && ${EN_LANGUAGE} && ${STATUS_STRICT} && defined(heroOrder)] | order(heroOrder asc) {
    _id, title, slug, description, publishedAt, featured, heroOrder,
    "mainImage": mainImage.asset->url,
    "category": category->{ _id, title, slug },
    "author": author->{ _id, name, slug, "image": image.asset->url, jobTitle }
  },
  "latestPosts": *[_type == "post" && ${EN_LANGUAGE} && ${STATUS_STRICT} && !defined(heroOrder)] | order(publishedAt desc) [0...6] {
    _id, title, slug, description, publishedAt, featured, heroOrder,
    "mainImage": mainImage.asset->url,
    "category": category->{ _id, title, slug },
    "author": author->{ _id, name, slug, "image": image.asset->url, jobTitle }
  },
  "categories": *[_type == "category" && active == true && count(*[_type == "post" && ${EN_LANGUAGE} && ${STATUS_STRICT} && references(^._id)]) > 0] | order(order asc) [0...3] {
    _id, title, slug, description,
    "image": image.asset->url,
    "postCount": count(*[_type == "post" && ${EN_LANGUAGE} && ${STATUS_STRICT} && references(^._id)])
  }
}`;

export const postBySlugQuery = `
  *[_type == "post" && ${EN_LANGUAGE} && slug.current == $slug && ${STATUS_APPROVED}][0]{
    _id,
    title,
    mainImage{asset->{url, altText}},
    body[]{
      ...,
      _type == "image" => {
        ...,
        asset->{ _id, url },
        alt
      },
      _type == "video" => {
        ...,
        file { asset->{ url } }
      }
    },
    _createdAt,
    "category": category->{title, slug},
    "author": author->{_id, name, slug, image{asset->{url}}, shortBio, jobTitle, employer, education}
  }
`;

export const postStaticParamsQuery = `*[_type == "post" && ${EN_LANGUAGE} && ${STATUS_APPROVED} && defined(slug.current) && defined(category->slug.current)]{
      "categorySlug": category->slug.current,
      "slug": slug.current
    }`;

// No status predicate today. That asymmetry with postBySlugQuery is pre-existing
// and deliberately carried over unchanged.
export const postMetadataBySlugQuery = `*[_type == "post" && ${EN_LANGUAGE} && slug.current == $slug][0]{
        title,
        metaDescription,
        description,
        "bodyDesc": pt::text(body[0..1]),
        "mainImageUrl": mainImage.asset->url,
        "authorName": author->name,
        publishedAt,
        _updatedAt
      }`;

export const postsByAuthorSlugQuery = `
  *[_type == "post" && ${EN_LANGUAGE} && ${STATUS_TOLERANT} && author->slug.current == $slug]
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

// No status predicate today. The missing filter is a real pre-existing SEO bug,
// logged separately and explicitly out of scope here: adding one would make this
// relocation behaviour-changing rather than inert.
export const sitemapQuery = `{
      "posts": *[
        _type == "post" &&
        ${EN_LANGUAGE} &&
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
    }`;

// No status predicate today (the caller renders every status to its own author).
// Deliberately NOT merged with authorReviewPostsQuery: this one projects "url"
// and takes $siteUrl. Merging would change a caller's output shape.
export const postsByAuthorIdQuery = `*[_type == "post" && ${EN_LANGUAGE} && author._ref == $authorId] | order(coalesce(publishedAt, _createdAt) desc) {
      "id": _id,
      title,
      "slug": slug.current,
      description,
      status,
      publishedAt,
      _createdAt,
      "mainImage": mainImage.asset->url,
      "category": category->{ title, "slug": slug.current },
      "url": select(
        defined(category) => $siteUrl + "/blog/" + category->slug.current + "/" + slug.current,
        null
      ),
      body[]{
        ...,
        _type == "image" => { ..., "asset": asset->{ "url": url } },
        _type == "video" => { ..., "fileUrl": file.asset->url }
      }
    }`;

// No status predicate today. Duplicated projection text with postsByAuthorIdQuery
// is intended: this one has no "url" projection and takes only $authorId.
export const authorReviewPostsQuery = `*[_type == "post" && ${EN_LANGUAGE} && author._ref == $authorId] | order(coalesce(publishedAt, _createdAt) desc) {
      "id": _id,
      title,
      "slug": slug.current,
      description,
      status,
      publishedAt,
      _createdAt,
      "mainImage": mainImage.asset->url,
      "category": category->{ title, "slug": slug.current },
      body[]{
        ...,
        _type == "image" => { ..., "asset": asset->{ "url": url } },
        _type == "video" => { ..., "fileUrl": file.asset->url }
      }
    }`;

// ── Pipeline reads (PIPE-01) ─────────────────────────────────────────────────
//
// The two queries below are the translation pipeline's SCRIPT-side reads. They
// are deliberately NOT part of the public read path: no server component, route
// handler or metadata route may consume them, and they are deliberately absent
// from the nine-query QUERIES array in scripts/checks/language-filter.check.ts,
// whose expected counts encode CONTENT-02's public read contract. A script-side
// read is a different surface, and they get their own assertion section there.
//
// They live in this module rather than in scripts/ because this is one of the
// three files under src/ allowed to carry the `language ==` text, and because
// the English source predicate they need is EN_LANGUAGE itself, interpolated
// rather than retyped.
//
// Both must be run through a client with `perspective: "raw"`. Farsi siblings
// exist only as drafts, so under the default published perspective the sibling
// count is always 0 and every post looks untranslated on every run.
//
// $slug is a GROQ parameter and never a template interpolation: its value comes
// off the command line (T-03-09). Pass `{ slug: null }` to select every post.

/** Approved English posts that have no Farsi sibling yet. */
export const translationCandidatesQuery = `*[
  _type == "post"
  && !(_id in path("drafts.**"))
  && ${EN_LANGUAGE}
  && ${STATUS_APPROVED}
  && (!defined($slug) || slug.current == $slug)
  && count(*[_type == "post" && language == "fa" && translationOf._ref in [^._id, "drafts." + ^._id]]) == 0
]{
  _id,
  _updatedAt,
  title,
  description,
  metaDescription,
  "slug": slug.current,
  publishedAt,
  category,
  author,
  mainImage,
  body
}`;

// The D-08 reporting surface. Identical filter to the candidates query with the
// sibling test inverted, so a run can LIST siblings whose source has moved on.
// Stale siblings are reported and never touched: retranslation is an explicit,
// separate action, not something a select query decides.
export const translationStaleQuery = `*[
  _type == "post"
  && !(_id in path("drafts.**"))
  && ${EN_LANGUAGE}
  && ${STATUS_APPROVED}
  && (!defined($slug) || slug.current == $slug)
  && count(*[_type == "post" && language == "fa" && translationOf._ref in [^._id, "drafts." + ^._id]]) > 0
]{
  _id,
  _updatedAt,
  title,
  description,
  metaDescription,
  "slug": slug.current,
  publishedAt,
  category,
  author,
  mainImage,
  body,
  "sibling": *[_type == "post" && language == "fa" && translationOf._ref in [^._id, "drafts." + ^._id]][0]{
    _id,
    sourceUpdatedAt
  }
}`;
