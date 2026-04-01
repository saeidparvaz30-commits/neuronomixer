import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PostActionButtons } from "@/app/dashboard/author/posts/PostActionButtons";

interface Post {
  _id: string;
  title: string;
  status: string;
  _createdAt: string;
  category?: { title: string };
}

async function getAuthorPosts(userId: string, sanityAuthorId: string | null): Promise<Post[]> {
  return client.fetch(
    `*[_type == "post" && (submittedBy == $userId ${sanityAuthorId ? "|| author._ref == $sanityAuthorId" : ""})] | order(_createdAt desc) {
      _id, title, status, _createdAt,
      category->{ title }
    }`,
    { userId, sanityAuthorId: sanityAuthorId ?? "" }
  );
}

const statusStyle: Record<string, string> = {
  approved:            "bg-green-500/20 text-green-300",
  pending:             "bg-yellow-500/20 text-yellow-300",
  rejected:            "bg-red-500/20 text-red-300",
  draft:               "bg-gray-500/20 text-gray-400",
  deletion_requested:  "bg-orange-500/20 text-orange-300",
};

export default async function AdminMyPostsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { sanityAuthorId: true } })
    : null;

  const posts = await getAuthorPosts(userId, user?.sanityAuthorId ?? null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">My Posts</h1>
        <Link
          href="/dashboard/admin/submit"
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-accent)] text-black text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-10 text-center">
          <p className="text-gray-500 mb-4">You haven&apos;t written any posts yet.</p>
          <Link
            href="/dashboard/admin/submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-xl text-sm hover:bg-[var(--color-accent)]/30 transition-colors"
          >
            <Plus size={14} />
            Write your first post
          </Link>
        </div>
      ) : (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {posts.map((post) => (
                <tr key={post._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium max-w-xs">
                    <span className="line-clamp-1">{post.title}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {post.category?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        statusStyle[post.status] ?? "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(post._createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <PostActionButtons
                      postId={post._id}
                      status={post.status}
                      editBasePath="/dashboard/admin/my-posts"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
