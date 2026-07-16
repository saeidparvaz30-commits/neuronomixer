import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Heart, Eye, Users, TrendingUp } from "lucide-react";

interface PostSummary {
  _id: string;
  title: string;
  status: string;
  _createdAt: string;
  slug?: { current: string };
}

const statusStyle: Record<string, string> = {
  approved:           "bg-green-500/20 text-green-300",
  pending:            "bg-yellow-500/20 text-yellow-300",
  rejected:           "bg-red-500/20 text-red-300",
  draft:              "bg-gray-500/20 text-gray-400",
  deletion_requested: "bg-orange-500/20 text-orange-300",
};

export default async function AuthorOverviewPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  // Fetch posts and user data in parallel
  const [posts, dbUser] = await Promise.all([
    client.fetch<PostSummary[]>(
      `*[_type == "post" && submittedBy == $userId] | order(_createdAt desc) [0...50] {
        _id, title, status, _createdAt, slug
      }`,
      { userId }
    ),
    prisma.user.findUnique({
      where: { id: userId },
      select: { sanityAuthorId: true },
    }),
  ]);

  const counts = {
    approved:  posts.filter((p) => p.status === "approved").length,
    pending:   posts.filter((p) => p.status === "pending").length,
    rejected:  posts.filter((p) => p.status === "rejected").length,
    draft:     posts.filter((p) => p.status === "draft").length,
  };

  // Slugs of approved posts — used to query engagement data
  const approvedSlugs = posts
    .filter((p) => p.status === "approved" && p.slug?.current)
    .map((p) => p.slug!.current);

  // Engagement stats from Prisma
  const [totalLikes, followerCount, viewRecords] = await Promise.all([
    approvedSlugs.length > 0
      ? prisma.like.count({ where: { postSlug: { in: approvedSlugs } } })
      : 0,
    dbUser?.sanityAuthorId
      ? prisma.follow.count({ where: { type: "author", sanityId: dbUser.sanityAuthorId } })
      : 0,
    approvedSlugs.length > 0
      ? prisma.readingHistory.findMany({
          where: { postSlug: { in: approvedSlugs } },
          select: { postSlug: true },
        })
      : [],
  ]);

  // Total views + most-viewed post
  const totalViews: number = viewRecords.length;
  const viewsBySlug: Record<string, number> = {};
  for (const r of viewRecords as { postSlug: string }[]) {
    viewsBySlug[r.postSlug] = (viewsBySlug[r.postSlug] ?? 0) + 1;
  }
  const topSlugEntry = Object.entries(viewsBySlug).sort((a, b) => b[1] - a[1])[0];
  const topPost = topSlugEntry
    ? posts.find((p) => p.slug?.current === topSlugEntry[0])
    : null;
  const topPostViews = topSlugEntry?.[1] ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Author Dashboard</h1>
        <Link
          href="/dashboard/author/submit"
          className="px-4 py-2 text-sm font-semibold bg-[var(--color-accent)] text-black rounded-xl hover:opacity-90 transition-opacity"
        >
          + New Post
        </Link>
      </div>

      {/* ── Post status counts ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-gray-500 capitalize mb-1">{status}</p>
            <p className={`text-2xl font-bold ${statusStyle[status]?.split(" ")[1] ?? "text-white"}`}>
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* ── Engagement stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total Likes */}
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <Heart size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Total Likes</p>
            <p className="text-2xl font-bold text-white">{totalLikes}</p>
          </div>
        </div>

        {/* Total Views */}
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <Eye size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Total Views</p>
            <p className="text-2xl font-bold text-white">{totalViews}</p>
          </div>
        </div>

        {/* Followers */}
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center shrink-0">
            <Users size={18} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Followers</p>
            <p className="text-2xl font-bold text-white">{followerCount}</p>
          </div>
        </div>
      </div>

      {/* ── Most viewed post ─────────────────────────────────────────────────── */}
      {topPost && (
        <div className="bg-[#060d18]/80 border border-[var(--color-accent)]/20 rounded-2xl p-5 mb-8 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-[var(--color-accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">Most Viewed Post</p>
            <p className="text-sm font-semibold text-white line-clamp-1">{topPost.title}</p>
          </div>
          <span className="shrink-0 text-sm font-bold text-[var(--color-accent)]">
            {topPostViews} {topPostViews === 1 ? "view" : "views"}
          </span>
        </div>
      )}

      {/* ── Recent posts ─────────────────────────────────────────────────────── */}
      <h2 className="text-lg font-semibold text-white mb-3">Recent Posts</h2>
      {posts.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No posts yet.{" "}
          <Link href="/dashboard/author/submit" className="text-[var(--color-accent)] hover:underline">
            Submit your first post.
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.slice(0, 10).map((post) => (
            <div
              key={post._id}
              className="bg-[#060d18]/80 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle[post.status] ?? "bg-gray-500/20 text-gray-400"}`}>
                {post.status === "deletion_requested" ? "del. requested" : post.status}
              </span>
              <span className="text-white text-sm flex-1 line-clamp-1">{post.title}</span>
              <span className="text-gray-600 text-xs shrink-0">
                {new Date(post._createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
