import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

async function getStats() {
  const [totalUsers, pendingAuthors, subscribers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { authorStatus: "PENDING" } }),
    prisma.user.count({ where: { role: "SUBSCRIBER" } }),
  ]);

  const pendingPosts = await client.fetch<number>(
    `count(*[_type == "post" && status == "pending"])`
  );

  return { totalUsers, pendingAuthors, pendingPosts, subscribers };
}

export default async function AdminOverviewPage() {
  const stats = await getStats();

  const cards = [
    { label: "Total Users", value: stats.totalUsers, color: "text-blue-400" },
    { label: "Pending Authors", value: stats.pendingAuthors, color: "text-yellow-400" },
    { label: "Pending Posts", value: stats.pendingPosts, color: "text-orange-400" },
    { label: "Subscribers", value: stats.subscribers, color: "text-green-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5"
          >
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <QuickLink
          href="/dashboard/admin/authors"
          title="Review Author Applications"
          desc={`${stats.pendingAuthors} pending`}
        />
        <QuickLink
          href="/dashboard/admin/posts"
          title="Review Submitted Posts"
          desc={`${stats.pendingPosts} pending`}
        />
        <QuickLink
          href="/dashboard/admin/users"
          title="Manage Users"
          desc={`${stats.totalUsers} total`}
        />
        <QuickLink
          href="/studio"
          title="Sanity Studio"
          desc="Full CMS access ↗"
          external
        />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
  external,
}: {
  href: string;
  title: string;
  desc: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="block bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 hover:border-[var(--color-accent)]/50 transition-colors group"
    >
      <p className="font-semibold text-white group-hover:text-[var(--color-accent)] transition-colors">
        {title}
      </p>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </a>
  );
}
