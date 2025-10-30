import { client } from "@/sanity/lib/client";
import { PortableText } from "@portabletext/react";
import Image from "next/image";
import Link from "next/link";
import SubscribeBox from "@/components/appSkeleton/SubscribeBox";
import RichText from "@/components/Blog/RichText";

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
    "author": author->{name, image{asset->{url}}, shortBio}
  },
  "siblings": *[_type == "post" && references(*[_type=="category" && slug.current == $categorySlug]._id)] 
               | order(_createdAt asc){
                 title,
                 slug,
                 "category": category->{slug}
               }
}
`;
export async function generateMetadata({
  params,
}: {
  params: { categorySlug: string; postSlug: string };
}) {
  const { postSlug, categorySlug } = params;

  const post = await client.fetch(
    `*[_type == "post" && slug.current == $slug][0]{ 
        title, 
        "description": pt::text(body[0..1]) 
      }`,
    { slug: postSlug }
  );

  const title = post?.title || "NeuroNomixer Blog Post";
  const description =
    post?.description?.slice(0, 150) ||
    "Exploring AI, data, and analytics with NeuroNomixer.";

  const canonicalUrl = `https://www.neuronomixer.com/blog/${categorySlug}/${postSlug}`;

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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ categorySlug: string; postSlug: string }>;
}) {
  const { postSlug, categorySlug } = await params;
  const data = await client.fetch(postQuery, { slug: postSlug, categorySlug });

  const post = data?.post;
  const siblings = data?.siblings || [];

  if (!post) {
    return <p className="text-center mt-20 text-lg">Post not found.</p>;
  }

  // Find current index in category’s list
  const currentIndex = siblings.findIndex(
    (p: any) => p.slug.current === postSlug
  );
  const prevPost = siblings[currentIndex - 1];
  const nextPost = siblings[currentIndex + 1];

  return (
    <main className="max-w-[1600px] mx-auto px-6 sm:px-6 py-12 flex flex-col lg:flex-row lg:items-start lg:gap-12 relative">
      {/* ===== Left Column: Main Post ===== */}
      <div className="flex-1">
        {/* Back link */}
        <div className="mb-8">
          <Link
            href={`/blog/${categorySlug}`}
            className="
      inline-block
      bg-white
      text-[var(--color-accent)]
      font-medium
      px-5 py-3
      rounded-lg
      shadow-md
      border border-[var(--color-accent)]
      transition-all duration-300
      hover:bg-[var(--color-primary)] hover:text-white
      active:bg-[var(--color-secondary)] active:scale-95
    "
          >
            ← Back to {post.category?.title}
          </Link>
        </div>

        {/* Post container */}
        <div className="bg-gray-300 text-black rounded-2xl shadow-lg p-5 sm:p-8 md:p-10">
          <div className="mb-8 text-center relative">
            <p className="text-sm text-gray-600 mb-2 italic text-right">
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
                <div className="bg-gray-300/60 text-black px-8 py-4 rounded-lg shadow-md">
                  <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold">
                    {post.title}
                  </h1>
                </div>
              </div>
            </div>

            {/* Post body */}
            <article className="prose prose-sm sm:prose lg:prose-lg max-w-none mx-auto mt-8 text-left sm:text-justify">
              <RichText value={post.body} />
            </article>
          </div>
        </div>
        <SubscribeBox />
      </div>

      {/* ===== Right Column: Sticky sidebar ===== */}
      {(post.author || nextPost) && (
        <aside
          className="
                      hidden lg:flex
                      sticky top-48
                      h-fit
                      flex-col
                      items-center
                      gap-6
                      w-[280px]
                    "
        >
          {/* Author box */}
          {post.author && (
            <Link
              href="/authors"
              className="
                  block
                  bg-[var(--surface)]/95
                  border border-[var(--color-accent)]/30
                  rounded-xl
                  p-8
                  shadow-md
                  w-full
                  flex flex-col
                  items-center
                  text-center
                  transition-all duration-300
                  hover:bg-white hover:text-white
                  active:bg-[var(--color-secondary)] active:scale-95
                "
            >
              {post.author.image?.asset?.url && (
                <Image
                  src={post.author.image.asset.url}
                  alt={post.author.name}
                  width={120}
                  height={120}
                  className="rounded-full object-cover shadow-md mb-4 aspect-square"
                />
              )}
              <h3 className="text-base font-semibold text-[var(--color-primary)] mb-1 group-hover:text-white">
                {post.author.name}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] group-hover:text-white/80">
                {post.author.shortBio}
              </p>
            </Link>
          )}

          {/* Next post button below author */}
          {nextPost && (
            <Link
              href={`/blog/${nextPost.category.slug.current}/${nextPost.slug.current}`}
              className="
          bg-white 
          text-[var(--color-accent)] 
          font-medium 
          px-5 py-3 
          rounded-lg 
          shadow-md 
          border border-[var(--color-accent)] 
          transition-all duration-300 
          hover:bg-[var(--color-primary)] hover:text-white 
          active:bg-[var(--color-secondary)] active:scale-95
          w-full text-center
        "
            >
              {nextPost.title} →
            </Link>
          )}
          {/* Prev navigation */}
          <div className="flex justify-between items-center mt-0 max-w-[1000px] mx-auto">
            {prevPost ? (
              <Link
                href={`/blog/${prevPost.category.slug.current}/${prevPost.slug.current}`}
                className="
            bg-white 
            text-[var(--color-accent)] 
            font-medium 
            px-5 py-2 
            rounded-lg 
            shadow-md 
            border border-[var(--color-accent)] 
            transition-all duration-300 
            hover:bg-[var(--color-primary)] hover:text-white 
            active:bg-[var(--color-secondary)] active:scale-95
          "
              >
                ← {prevPost.title}
              </Link>
            ) : (
              <span />
            )}
          </div>
        </aside>
      )}
    </main>
  );
}
