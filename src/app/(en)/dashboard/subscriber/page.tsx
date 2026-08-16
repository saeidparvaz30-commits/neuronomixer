import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import Link from "next/link";
import { Rss } from "lucide-react";
import AuthorApplicationModal from "@/components/dashboard/AuthorApplicationModal";

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  description?: string;
  author?: { name: string };
  category?: { title: string; slug: { current: string } };
}

async function getFollowedPosts(userId: string): Promise<Post[]> {
  const follows = await prisma.follow.findMany({ where: { userId } });
  const authorIds = follows.filter((f) => f.type === "author").map((f) => f.sanityId);
  const categoryIds = follows.filter((f) => f.type === "category").map((f) => f.sanityId);
  if (authorIds.length === 0 && categoryIds.length === 0) return [];

  const conditions = [
    authorIds.length > 0 ? `author._ref in $authorIds` : null,
    categoryIds.length > 0 ? `category._ref in $categoryIds` : null,
  ]
    .filter(Boolean)
    .join(" || ");

  return client.fetch(
    `*[_type == "post" && (status == "approved" || (status == "scheduled" && publishedAt <= now())) && (${conditions})] | order(publishedAt desc) [0...30] {
      _id, title, slug, publishedAt, description,
      author->{ name },
      category->{ title, slug }
    }`,
    { authorIds, categoryIds }
  );
}

export default async function SubscriberFeedPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");

  const userId = session.user.id;
  const role = session.user?.role as string | undefined;
  const [posts, follows, dbUser] = await Promise.all([
    getFollowedPosts(userId),
    prisma.follow.findMany({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { authorStatus: true } }),
  ]);

  const isAlreadyAuthorOrAdmin = role === "AUTHOR" || role === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      {/* Apply as Author CTA — hidden for existing authors/admins */}
      {!isAlreadyAuthorOrAdmin && (
        <AuthorApplicationModal initialStatus={dbUser?.authorStatus ?? null} />
      )}

      <div>
      <div className="flex items-center gap-2 mb-6">
        <Rss size={18} className="text-[var(--color-accent)]" />
        <h2 className="text-lg font-semibold text-white">Your Feed</h2>
        {posts.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">{posts.length} posts</span>
        )}
      </div>

      {follows.length === 0 ? (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-10 text-center">
          <Rss size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 font-medium">Your feed is empty</p>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            Follow authors or categories to see their posts here.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/authors"
              className="px-4 py-2 rounded-xl text-sm bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/30 transition-colors"
            >
              Browse Authors
            </Link>
            <Link
              href="/blog"
              className="px-4 py-2 rounded-xl text-sm bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-colors"
            >
              Browse Blog
            </Link>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-10 text-center">
          <p className="text-gray-400">No new posts yet from who you follow.</p>
          <p className="text-sm text-gray-600 mt-1">Check back later.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <Link
              key={post._id}
              href={`/blog/${post.category?.slug?.current}/${post.slug.current}`}
              className="block bg-[#060d18]/80 border border-white/10 rounded-2xl p-5
                         hover:border-[var(--color-accent)]/40 transition-colors group"
            >
              <p className="font-semibold text-white group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                {post.title}
              </p>
              {post.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{post.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {post.author?.name && (
                  <span className="text-xs text-gray-500">by {post.author.name}</span>
                )}
                {post.category?.title && (
                  <span className="text-xs bg-[var(--color-accent)]/15 text-[var(--color-accent)] px-2 py-0.5 rounded-full">
                    {post.category.title}
                  </span>
                )}
                {post.publishedAt && (
                  <span className="text-xs text-gray-600 ml-auto">
                    {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
