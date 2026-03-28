import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";

interface Post {
  _id: string;
  title: string;
  status: string;
  _createdAt: string;
  category?: { title: string };
}

async function getAuthorPosts(userId: string): Promise<Post[]> {
  return client.fetch(
    `*[_type == "post" && submittedBy == $userId] | order(_createdAt desc) {
      _id, title, status, _createdAt,
      category->{ title }
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

export default async function AuthorPostsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";
  const posts = await getAuthorPosts(userId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">My Posts</h1>

      {posts.length === 0 ? (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-8 text-center text-gray-500">
          You haven&apos;t submitted any posts yet.
        </div>
      ) : (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {posts.map((post) => (
                <tr key={post._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium line-clamp-1">
                    {post.title}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {post.category?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle[post.status] ?? "bg-gray-500/20 text-gray-400"}`}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
