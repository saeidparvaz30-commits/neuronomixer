import { client } from "@/sanity/lib/client";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import RichText from "@/components/Blog/RichText";
import { BlogPostBody } from "@/components/Blog/BlogPostBody";
import ReadTracker from "@/components/Blog/ReadTracker";
import PostEngagement from "@/components/Blog/PostEngagement";
import CommentsSection from "@/components/Blog/CommentsSection";
import AuthorFollowButton from "@/components/author/AuthorFollowButton";

export const revalidate = 3600;

const postQuery = `
  *[_type == "post" && slug.current == $slug && status == "approved"][0]{
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
export async function generateStaticParams() {
  const posts = await client.fetch<{ categorySlug: string; slug: string }[]>(
    `*[_type == "post" && status == "approved" && defined(slug.current) && defined(category->slug.current)]{
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
        metaDescription,
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
    post?.metaDescription ||
    post?.description ||
    post?.bodyDesc?.slice(0, 155) ||
    "Exploring AI, data, and analytics with NeuroNomixer.";

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com").replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/blog/${categorySlug}/${postSlug}`;
  const ogImage = post?.mainImageUrl
    ? [{ url: post.mainImageUrl, width: 1200, height: 630, alt: title }]
    : [{ url: `${siteUrl}/og/og-default.png`, width: 1200, height: 630, alt: "NeuroNomixer" }];

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

  const post = await client.fetch(postQuery, { slug: postSlug });

  if (!post) notFound();

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
      logo: { "@type": "ImageObject", url: `${siteUrl}/og/logo-512.png` },
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
            href={`/blog?cat=${categorySlug}`}
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
            ← Back to Blog
          </Link>
        </div>

        {/* Post container */}
        <div className="bg-white text-gray-900 rounded-2xl shadow-lg p-5 sm:p-8 md:p-10">
          <p className="text-sm text-gray-500 mb-3 italic text-right">
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
          <BlogPostBody authorName={post.author?.name}>
            <RichText value={post.body} />
          </BlogPostBody>

          <PostEngagement
            postSlug={postSlug}
            postTitle={post.title}
            categorySlug={categorySlug}
          />

          <CommentsSection postSlug={postSlug} />
        </div>
      </div>

      {/* ===== Right Column: Author sidebar ===== */}
      {post.author && (
        <aside className="hidden lg:flex sticky top-24 h-fit flex-col items-center gap-6 w-[280px]">
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

            <AuthorFollowButton authorId={post.author._id} />
          </div>
        </aside>
      )}
    </main>
  );
}
