import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { Heart, Eye, Users, TrendingUp } from "lucide-react";

async function getPlatformStats() {
  const [totalUsers, subscribers, pendingAuthors, pendingPosts] = await Promise.all([
    (prisma as any).user.count(),
    (prisma as any).user.count({ where: { role: "SUBSCRIBER" } }),
    // Use Sanity as source of truth — matches the Authors review page
    client.fetch<number>(`count(*[_type == "author" && applicationStatus == "pending"])`),
    client.fetch<number>(`count(*[_type == "post" && status == "pending"])`),
  ]);

  return { totalUsers, pendingAuthors, pendingPosts, subscribers };
}

async function getAuthorEngagement(userId: string) {
  // Get admin's sanityAuthorId
  const dbUser = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { sanityAuthorId: true },
  });

  if (!dbUser?.sanityAuthorId) return null;

  // Get approved post slugs from Sanity
  const approvedPosts = await client.fetch<{ slug?: { current: string }; title: string }[]>(
    `*[_type == "post" && submittedBy == $userId && status == "approved"] { slug, title }`,
    { userId }
  );

  const slugs = approvedPosts
    .filter((p) => p.slug?.current)
    .map((p) => p.slug!.current);

  if (slugs.length === 0 && !dbUser.sanityAuthorId) return null;

  const [totalLikes, followerCount, viewRecords] = await Promise.all([
    slugs.length > 0
      ? (prisma as any).like.count({ where: { postSlug: { in: slugs } } })
      : 0,
    (prisma as any).follow.count({ where: { type: "author", sanityId: dbUser.sanityAuthorId } }),
    slugs.length > 0
      ? (prisma as any).readingHistory.findMany({
          where: { postSlug: { in: slugs } },
          select: { postSlug: true },
        })
      : [],
  ]);

  const totalViews: number = viewRecords.length;
  const viewsBySlug: Record<string, number> = {};
  for (const r of viewRecords as { postSlug: string }[]) {
    viewsBySlug[r.postSlug] = (viewsBySlug[r.postSlug] ?? 0) + 1;
  }

  const topEntry = Object.entries(viewsBySlug).sort((a, b) => b[1] - a[1])[0];
  const topPost = topEntry ? approvedPosts.find((p) => p.slug?.current === topEntry[0]) : null;

  return { totalLikes, followerCount, totalViews, topPost, topPostViews: topEntry?.[1] ?? 0 };
}

export default async function AdminOverviewPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [stats, engagement] = await Promise.all([
    getPlatformStats(),
    getAuthorEngagement(userId),
  ]);

  const platformCards = [
    { label: "Total Users",     value: stats.totalUsers,     color: "text-blue-400"   },
    { label: "Pending Authors", value: stats.pendingAuthors, color: "text-yellow-400" },
    { label: "Pending Posts",   value: stats.pendingPosts,   color: "text-orange-400" },
    { label: "Subscribers",     value: stats.subscribers,    color: "text-green-400"  },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Overview</h1>

      {/* ── Platform stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {platformCards.map((card) => (
          <div key={card.label} className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Author engagement (shown when admin has a linked Sanity author) ── */}
      {engagement && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Your Author Stats
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Total Likes</p>
                <p className="text-2xl font-bold text-white">{engagement.totalLikes}</p>
              </div>
            </div>

            <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                <Eye size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Total Views</p>
                <p className="text-2xl font-bold text-white">{engagement.totalViews}</p>
              </div>
            </div>

            <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center shrink-0">
                <Users size={18} className="text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Followers</p>
                <p className="text-2xl font-bold text-white">{engagement.followerCount}</p>
              </div>
            </div>
          </div>

          {engagement.topPost && (
            <div className="mt-4 bg-[#060d18]/80 border border-[var(--color-accent)]/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-[var(--color-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">Most Viewed Post</p>
                <p className="text-sm font-semibold text-white line-clamp-1">{engagement.topPost.title}</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-[var(--color-accent)]">
                {engagement.topPostViews} {engagement.topPostViews === 1 ? "view" : "views"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Quick links ─────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <QuickLink href="/dashboard/admin/authors" title="Review Author Applications" desc={`${stats.pendingAuthors} pending`} />
        <QuickLink href="/dashboard/admin/posts"   title="Review Submitted Posts"    desc={`${stats.pendingPosts} pending`}   />
        <QuickLink href="/dashboard/admin/users"   title="Manage Users"              desc={`${stats.totalUsers} total`}       />
        <QuickLink href="/studio" title="Sanity Studio" desc="Full CMS access ↗" external />
      </div>
    </div>
  );
}

function QuickLink({
  href, title, desc, external,
}: {
  href: string; title: string; desc: string; external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="block bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 hover:border-[var(--color-accent)]/50 transition-colors group"
    >
      <p className="font-semibold text-white group-hover:text-[var(--color-accent)] transition-colors">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </a>
  );
}
