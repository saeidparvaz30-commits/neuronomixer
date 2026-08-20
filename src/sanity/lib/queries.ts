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

export const STATUS_TOLERANT = `(status == "approved" || !defined(status) || (status == "scheduled" && publishedAt <= now()))`;

export const STATUS_STRICT = `(status == "approved" || (status == "scheduled" && publishedAt <= now()))`;

export const STATUS_APPROVED = `status == "approved"`;

export const blogIndexQuery = `{
  "categories": *[_type == "category" && active == true] | order(order asc) {
    _id, title, slug, description, intuitive
  },
  "posts": *[_type == "post" && ${STATUS_TOLERANT}] | order(featured desc, publishedAt desc) {
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
  "heroPosts": *[_type == "post" && ${STATUS_STRICT} && defined(heroOrder)] | order(heroOrder asc) {
    _id, title, slug, description, publishedAt, featured, heroOrder,
    "mainImage": mainImage.asset->url,
    "category": category->{ _id, title, slug },
    "author": author->{ _id, name, slug, "image": image.asset->url, jobTitle }
  },
  "latestPosts": *[_type == "post" && ${STATUS_STRICT} && !defined(heroOrder)] | order(publishedAt desc) [0...6] {
    _id, title, slug, description, publishedAt, featured, heroOrder,
    "mainImage": mainImage.asset->url,
    "category": category->{ _id, title, slug },
    "author": author->{ _id, name, slug, "image": image.asset->url, jobTitle }
  },
  "categories": *[_type == "category" && active == true && count(*[_type == "post" && ${STATUS_STRICT} && references(^._id)]) > 0] | order(order asc) [0...3] {
    _id, title, slug, description,
    "image": image.asset->url,
    "postCount": count(*[_type == "post" && ${STATUS_STRICT} && references(^._id)])
  }
}`;
