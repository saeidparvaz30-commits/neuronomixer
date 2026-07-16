import { client } from "@/sanity/lib/client";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Linkedin, Github, Twitter, Globe, Mail, FileText } from "lucide-react";
import AuthorFollowButton from "@/components/author/AuthorFollowButton";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const authorQuery = `
  *[_type == "author" && slug.current == $slug && applicationStatus == "approved"][0]{
    _id,
    name,
    slug,
    userId,
    image { asset->{ url } },
    shortBio,
    longBio,
    linkedIn,
    github,
    twitter,
    personalWebsite,
    email
  }
`;

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

export async function generateStaticParams() {
  const authors = await client.fetch<{ slug: string }[]>(
    `*[_type == "author" && applicationStatus == "approved" && defined(slug.current)]{ "slug": slug.current }`
  );
  return authors.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = await client.fetch(authorQuery, { slug });
  if (!author) return {};

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com").replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/authors/${slug}`;
  const title = `${author.name} | NeuroNomixer`;
  const description = author.shortBio ?? `Articles and insights by ${author.name} on NeuroNomixer.`;
  const ogImage = author.image?.asset?.url
    ? [{ url: author.image.asset.url, width: 400, height: 400, alt: author.name }]
    : [{ url: `${siteUrl}/pictures/Logo.png`, alt: "NeuroNomixer" }];

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "NeuroNomixer",
      type: "profile",
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage.map((i) => i.url),
    },
  };
}

export const revalidate = 60;

export default async function AuthorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [author, posts] = await Promise.all([
    client.fetch(authorQuery, { slug }),
    client.fetch(postsQuery, { slug }),
  ]);

  if (!author) notFound();

  // Check for public CV
  let cvSlug: string | null = null;
  if (author.userId) {
    const cv = await prisma.authorCV.findUnique({
      where: { userId: author.userId },
      select: { slug: true, isPublic: true },
    });
    if (cv?.isPublic && cv.slug) cvSlug = cv.slug;
  }

  const session = await auth();
  let isFollowing = false;
  if (session?.user) {
    const follow = await prisma.follow.findUnique({
      where: {
        userId_type_sanityId: {
          userId: session.user.id,
          type: "author",
          sanityId: author._id,
        },
      },
    });
    isFollowing = !!follow;
  }

  type PortableTextChild = { text: string };
  type PortableTextBlock = { children?: PortableTextChild[] };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com").replace(/\/$/, "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    url: `${siteUrl}/authors/${slug}`,
    description: author.shortBio ?? undefined,
    ...(author.image?.asset?.url && { image: author.image.asset.url }),
    ...(author.jobTitle && { jobTitle: author.jobTitle }),
    ...(author.employer && { worksFor: { "@type": "Organization", name: author.employer } }),
    ...(author.linkedIn && { sameAs: [author.linkedIn] }),
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Profile header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
        {author.image?.asset?.url ? (
          <div className="relative w-28 h-28 rounded-full overflow-hidden shrink-0 shadow-md">
            <Image
              src={author.image.asset.url}
              alt={author.name}
              fill
              sizes="112px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-28 h-28 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-accent)] text-2xl font-bold shrink-0">
            {author.name?.[0] ?? "A"}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-white mb-1">{author.name}</h1>

          {author.shortBio && (
            <p className="text-[var(--color-text-muted)] italic mb-3">{author.shortBio}</p>
          )}

          {author.longBio && (
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              {(author.longBio as PortableTextBlock[])
                .flatMap((b) => b.children?.map((c) => c.text) ?? [])
                .join(" ")}
            </p>
          )}

          {/* Social links */}
          <div className="flex items-center gap-4 justify-center sm:justify-start mb-4">
            {author.linkedIn && (
              <a href={author.linkedIn} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5 text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors" />
              </a>
            )}
            {author.github && (
              <a href={author.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <Github className="w-5 h-5 text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors" />
              </a>
            )}
            {author.twitter && (
              <a href={author.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <Twitter className="w-5 h-5 text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors" />
              </a>
            )}
            {author.personalWebsite && (
              <a href={author.personalWebsite} target="_blank" rel="noopener noreferrer" aria-label="Website">
                <Globe className="w-5 h-5 text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors" />
              </a>
            )}
            {author.email && (
              <a href={`mailto:${author.email}`} aria-label="Email">
                <Mail className="w-5 h-5 text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            <AuthorFollowButton
              authorId={author._id}
              isFollowing={isFollowing}
              isLoggedIn={!!session?.user}
            />
            {cvSlug && (
              <Link
                href={`/cv/${cvSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg border border-[var(--color-accent)]/40 text-[var(--color-accent)] text-sm font-medium hover:bg-[var(--color-accent)]/10 transition-colors"
              >
                <FileText size={14} />
                View CV
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-5">
          Articles <span className="text-gray-500 text-base font-normal">({posts.length})</span>
        </h2>

        {posts.length === 0 ? (
          <p className="text-gray-500">No published articles yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post: {
              _id: string;
              title: string;
              slug: { current: string };
              publishedAt: string;
              description?: string;
              mainImage?: { asset?: { url: string } };
              category?: { title: string; slug: { current: string } };
            }) => (
              <Link
                key={post._id}
                href={`/blog/${post.category?.slug?.current}/${post.slug.current}`}
                className="flex gap-4 bg-[#060d18]/80 border border-white/10 rounded-2xl p-4
                           hover:border-[var(--color-accent)]/40 transition-colors group"
              >
                {post.mainImage?.asset?.url && (
                  <Image
                    src={post.mainImage.asset.url}
                    alt={post.title}
                    width={80}
                    height={80}
                    className="rounded-xl object-cover shrink-0 w-20 h-20"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                    {post.title}
                  </p>
                  {post.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{post.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {post.category?.title && (
                      <span className="text-xs bg-[var(--color-accent)]/15 text-[var(--color-accent)] px-2 py-0.5 rounded-full">
                        {post.category.title}
                      </span>
                    )}
                    {post.publishedAt && (
                      <span className="text-xs text-gray-600">
                        {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
