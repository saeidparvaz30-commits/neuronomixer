import { client } from "@/sanity/lib/client";
import Image from "next/image";
import Link from "next/link";
import SubscribeBox from "@/components/appSkeleton/SubscribeBox";
import RichText from "@/components/Blog/RichText";
import ReadTracker from "@/components/Blog/ReadTracker";
import PostEngagement from "@/components/Blog/PostEngagement";
import CommentsSection from "@/components/Blog/CommentsSection";
import AuthorFollowButton from "@/components/author/AuthorFollowButton";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const postQuery = `
{
  "post": *[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    mainImage{asset->{url, altText}},
    body[]{
  ...,
  _type == "image" => {
    ...,
    asset->{
      _id,
      url
    },
    alt
  }
},
    _createdAt,
    "category": category->{title, slug},
    "author": author->{_id, name, slug, image{asset->{url}}, shortBio, jobTitle, employer, education}
  },
  "siblings": *[_type == "post" && references(*[_type=="category" && slug.current == $categorySlug]._id)]
               | order(_createdAt asc){
                 title,
                 slug,
                 "category": category->{slug}
               }
}
`;
export async function generateStaticParams() {
  const posts = await client.fetch<{ categorySlug: string; slug: string }[]>(
    `*[_type == "post" && defined(slug.current) && defined(category->slug.current)]{
      "categorySlug": category->slug.current,
      "slug": slug.current
    }`
  );
  return posts.map((p) => ({ categorySlug: p.categorySlug, postSlug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; postSlug: string }>;
}) {
  const { postSlug, categorySlug } = await params;

  const post = await client.fetch(
    `*[_type == "post" && slug.current == $slug][0]{
        title,
        description,
        "bodyDesc": pt::text(body[0..1]),
        "mainImageUrl": mainImage.asset->url,
        "authorName": author->name,
        publishedAt,
        _updatedAt
      }`,
    { slug: postSlug }
  );

  const title = post?.title || "NeuroNomixer Blog Post";
  const description =
    post?.description ||
    post?.bodyDesc?.slice(0, 155) ||
    "Exploring AI, data, and analytics with NeuroNomixer.";

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com").replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/blog/${categorySlug}/${postSlug}`;
  const ogImage = post?.mainImageUrl
    ? [{ url: post.mainImageUrl, width: 1200, height: 630, alt: title }]
    : [{ url: `${siteUrl}/pictures/Logo.png`, alt: "NeuroNomixer" }];

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "NeuroNomixer",
      type: "article",
      images: ogImage,
      ...(post?.publishedAt && { publishedTime: post.publishedAt }),
      ...(post?._updatedAt && { modifiedTime: post._updatedAt }),
      ...(post?.authorName && { authors: [post.authorName] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage.map((i) => i.url),
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ categorySlug: string; postSlug: string }>;
}) {
  const { postSlug, categorySlug } = await params;

  const session = await auth();

  // NOTE: like/bookmark require `npx prisma migrate dev --name p1-engagement` to be run first.
  // Until then they degrade gracefully (0 likes, not bookmarked).
  const db = prisma as any;

  const [data, likeCount, userLike, userBookmark] = await Promise.all([
    client.fetch(postQuery, { slug: postSlug, categorySlug }),
    (db.like?.count({ where: { postSlug } }) ?? Promise.resolve(0)).catch(() => 0),
    session?.user
      ? (db.like?.findUnique({
          where: { userId_postSlug: { userId: session.user.id, postSlug } },
        }) ?? Promise.resolve(null)).catch(() => null)
      : null,
    session?.user
      ? (db.bookmark?.findUnique({
          where: { userId_postSlug: { userId: session.user.id, postSlug } },
        }) ?? Promise.resolve(null)).catch(() => null)
      : null,
  ]);

  const post = data?.post;
  const siblings = data?.siblings || [];

  const isFollowingAuthor = session?.user && post?.author?._id
    ? !!(await (prisma as any).follow.findUnique({
        where: { userId_type_sanityId: { userId: session.user.id, type: "author", sanityId: post.author._id } },
      }).catch(() => null))
    : false;

  if (!post) {
    return <p className="text-center mt-20 text-lg">Post not found.</p>;
  }

  type Sibling = { title: string; slug: { current: string }; category: { slug: { current: string } } };
  const currentIndex = (siblings as Sibling[]).findIndex(
    (p) => p.slug.current === postSlug
  );
  const prevPost = siblings[currentIndex - 1];
  const nextPost = siblings[currentIndex + 1];

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com").replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/blog/${categorySlug}/${postSlug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description ?? undefined,
    url: canonicalUrl,
    datePublished: post._createdAt,
    ...(post.mainImage?.asset?.url && {
      image: { "@type": "ImageObject", url: post.mainImage.asset.url },
    }),
    ...(post.author && {
      author: {
        "@type": "Person",
        name: post.author.name,
        ...(post.author.slug?.current && { url: `${siteUrl}/authors/${post.author.slug.current}` }),
      },
    }),
    publisher: {
      "@type": "Organization",
      name: "NeuroNomixer",
      logo: { "@type": "ImageObject", url: `${siteUrl}/pictures/Logo.png` },
    },
  };

  return (
    <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-12 flex flex-col lg:flex-row lg:items-start lg:gap-12 relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadTracker
        postSlug={postSlug}
        postTitle={post.title}
        categorySlug={categorySlug}
        authorName={post.author?.name}
      />
      {/* ===== Left Column: Main Post ===== */}
      <div className="flex-1">
        {/* Back link */}
        <div className="mb-8">
          <Link
            href={`/blog/${categorySlug}`}
            className="
      inline-block
      bg-[var(--color-surface)]
      text-[var(--color-accent)]
      font-medium
      px-5 py-3
      rounded-lg
      shadow-md
      border border-[var(--color-accent)]/60
      transition-all duration-300
      hover:bg-[var(--color-primary)] hover:text-white hover:border-transparent
      active:scale-95
    "
          >
            ← Back to {post.category?.title}
          </Link>
        </div>

        {/* Post container */}
        <div className="bg-white text-gray-900 rounded-2xl shadow-lg p-5 sm:p-8 md:p-10">
          <div className="mb-8 text-center relative">
            <p className="text-sm text-gray-500 mb-2 italic text-right">
              Published: {new Date(post._createdAt).toLocaleDateString()}
            </p>

            {/* Image + overlay title */}
            <div className="relative mb-6">
              {post.mainImage?.asset?.url && (
                <Image
                  src={post.mainImage.asset.url}
                  alt={post.mainImage.asset.altText || post.title}
                  width={2000}
                  height={500}
                  className="rounded-xl shadow-md object-cover my-2 w-full h-60 sm:h-80 md:h-96"
                />
              )}
              {/* Title overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/55 text-white px-6 sm:px-8 py-4 rounded-lg shadow-md max-w-[90%]">
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight">
                    {post.title}
                  </h1>
                </div>
              </div>
            </div>

            {/* Post body */}
            <article className="prose prose-sm sm:prose lg:prose-lg max-w-none mx-auto mt-8 text-left sm:text-justify">
              <RichText value={post.body} />
            </article>

            <PostEngagement
              postSlug={postSlug}
              postTitle={post.title}
              categorySlug={categorySlug}
              isLoggedIn={!!session?.user}
              initialLiked={!!userLike}
              initialLikeCount={likeCount}
              initialBookmarked={!!userBookmark}
            />

            <CommentsSection
              postSlug={postSlug}
              isLoggedIn={!!session?.user}
              currentUserId={session?.user?.id}
              isAdmin={(session?.user as any)?.role === "ADMIN"}
            />
          </div>
        </div>
        <SubscribeBox />
      </div>

      {/* ===== Right Column: Sticky sidebar ===== */}
      {(post.author || nextPost) && (
        <aside
          className="
                      hidden lg:flex
                      sticky top-24
                      h-fit
                      flex-col
                      items-center
                      gap-6
                      w-[280px]
                    "
        >
          {/* Author box */}
          {post.author && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-accent)]/30 rounded-xl p-6 shadow-md w-full flex flex-col items-center text-center">
              <Link href={post.author.slug?.current ? `/authors/${post.author.slug.current}` : "/authors"}>
                {post.author.image?.asset?.url && (
                  <Image
                    src={post.author.image.asset.url}
                    alt={post.author.name}
                    width={100}
                    height={100}
                    className="rounded-full object-cover shadow-md mb-4 aspect-square hover:opacity-90 transition-opacity"
                  />
                )}
              </Link>

              <Link href={post.author.slug?.current ? `/authors/${post.author.slug.current}` : "/authors"}>
                <h3 className="text-base font-semibold text-[var(--color-accent)] mb-1 hover:underline">
                  {post.author.name}
                </h3>
              </Link>

              {(post.author.jobTitle || post.author.employer) && (
                <p className="text-xs text-gray-400 mb-0.5">
                  {post.author.jobTitle}
                  {post.author.jobTitle && post.author.employer && " · "}
                  {post.author.employer}
                </p>
              )}
              {post.author.education && (
                <p className="text-xs text-gray-500 mb-2">{post.author.education}</p>
              )}

              {post.author.shortBio && (
                <p className="text-xs text-[var(--color-text-muted)] italic mb-4">
                  {post.author.shortBio}
                </p>
              )}

              <AuthorFollowButton
                authorId={post.author._id}
                isFollowing={isFollowingAuthor}
                isLoggedIn={!!session?.user}
              />
            </div>
          )}

          {/* Next post */}
          {nextPost && (
            <Link
              href={`/blog/${nextPost.category.slug.current}/${nextPost.slug.current}`}
              className="
          bg-[var(--color-surface)]
          text-[var(--color-accent)]
          font-medium
          px-5 py-3
          rounded-lg
          shadow-md
          border border-[var(--color-accent)]/60
          transition-all duration-300
          hover:bg-[var(--color-primary)] hover:text-white hover:border-transparent
          active:scale-95
          w-full text-center
        "
            >
              {nextPost.title} →
            </Link>
          )}

          {/* Prev post */}
          {prevPost && (
            <Link
              href={`/blog/${prevPost.category.slug.current}/${prevPost.slug.current}`}
              className="
          bg-[var(--color-surface)]
          text-[var(--color-accent)]
          font-medium
          px-5 py-3
          rounded-lg
          shadow-md
          border border-[var(--color-accent)]/60
          transition-all duration-300
          hover:bg-[var(--color-primary)] hover:text-white hover:border-transparent
          active:scale-95
          w-full text-center
        "
            >
              ← {prevPost.title}
            </Link>
          )}
        </aside>
      )}
    </main>
  );
}
