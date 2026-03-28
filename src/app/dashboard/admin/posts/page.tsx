import { client } from "@/sanity/lib/client";
import PostReviewRow from "./PostReviewRow";

interface PendingPost {
  _id: string;
  title: string;
  submittedBy?: string;
  publishedAt?: string;
  _createdAt: string;
  author?: { name: string };
  category?: { title: string };
}

async function getPendingPosts(): Promise<PendingPost[]> {
  return client.fetch(
    `*[_type == "post" && status == "pending"] | order(_createdAt asc) {
      _id, title, submittedBy, publishedAt, _createdAt,
      author->{ name },
      category->{ title }
    }`
  );
}

export default async function AdminPostsPage() {
  const posts = await getPendingPosts();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Post Review</h1>

      {posts.length === 0 ? (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-8 text-center text-gray-500">
          No posts pending review.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostReviewRow key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
