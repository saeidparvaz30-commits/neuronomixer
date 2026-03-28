import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";
import Link from "next/link";

interface PostSummary {
  _id: string;
  title: string;
  status: string;
  _createdAt: string;
}

async function getAuthorPosts(userId: string): Promise<PostSummary[]> {
  return client.fetch(
    `*[_type == "post" && submittedBy == $userId] | order(_createdAt desc) [0...20] {
      _id, title, status, _createdAt
    }`,
    { userId }
  );
}

const statusStyle: Record<string, string> = {
  approved: "bg-green-500/20 text-green-300",
  pending: "bg-yellow-500/20 text-yellow-300",
  rejected: "bg-red-500/20 text-red-300",
  draft: "bg-gray-500/20 text-gray-400",
};

export default async function AuthorOverviewPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const posts = await getAuthorPosts(userId);

  const counts = {
    approved: posts.filter((p) => p.status === "approved").length,
    pending: posts.filter((p) => p.status === "pending").length,
    rejected: posts.filter((p) => p.status === "rejected").length,
    draft: posts.filter((p) => p.status === "draft").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Author Dashboard</h1>
        <Link
          href="/dashboard/author/submit"
          className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] text-black rounded-lg hover:opacity-90 transition-opacity"
        >
          + New Post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Object.entries(counts).map(([status, count]) => (
          <div
            key={status}
            className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-4"
          >
            <p className="text-xs text-gray-500 capitalize mb-1">{status}</p>
            <p className={`text-2xl font-bold ${statusStyle[status]?.split(" ")[1] ?? "text-white"}`}>
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* Recent posts */}
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
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle[post.status] ?? "bg-gray-500/20 text-gray-400"}`}
              >
                {post.status}
              </span>
              <span className="text-white text-sm flex-1 line-clamp-1">{post.title}</span>
              <span className="text-gray-600 text-xs shrink-0">
                {new Date(post._createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
