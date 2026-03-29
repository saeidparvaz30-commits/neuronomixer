import { client } from "@/sanity/lib/client";
import PostReviewRow from "./PostReviewRow";
import DeletionRequestRow from "./DeletionRequestRow";
import PublishedPostRow from "./PublishedPostRow";

interface PendingPost {
  _id: string;
  title: string;
  submittedBy?: string;
  publishedAt?: string;
  _createdAt: string;
  author?: { name: string };
  category?: { title: string };
  body?: unknown[];
  mainImage?: { asset?: { url: string } };
}

interface PublishedPost {
  _id: string;
  title: string;
  status: string | null;
  publishedAt: string | null;
  _updatedAt: string;
  author?: { name: string };
  category?: { title: string };
}

const POST_FIELDS = `
  _id, title, submittedBy, publishedAt, _createdAt,
  body[]{
    ...,
    _type == "image" => { ..., asset->{ _id, url }, alt }
  },
  mainImage{ asset->{ url } },
  author->{ name },
  category->{ title }
`;

async function getPendingPosts(): Promise<PendingPost[]> {
  return client.fetch(
    `*[_type == "post" && status == "pending"] | order(_createdAt asc) { ${POST_FIELDS} }`
  );
}

async function getDeletionRequests(): Promise<PendingPost[]> {
  return client.fetch(
    `*[_type == "post" && status == "deletion_requested"] | order(_createdAt asc) { ${POST_FIELDS} }`
  );
}

async function getPublishedPosts(): Promise<PublishedPost[]> {
  return client.fetch(
    `*[_type == "post" && (status == "approved" || status == "hidden" || !defined(status))] | order(coalesce(publishedAt, _createdAt) desc) {
      _id, title, status, publishedAt, _updatedAt,
      author->{ name },
      category->{ title }
    }`
  );
}

export default async function AdminPostsPage() {
  const [pendingPosts, deletionPosts, publishedPosts] = await Promise.all([
    getPendingPosts(),
    getDeletionRequests(),
    getPublishedPosts(),
  ]);

  return (
    <div className="space-y-10">

      {/* ── Pending Review ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">
          Post Review
          {pendingPosts.length > 0 && (
            <span className="ml-3 text-sm font-normal text-yellow-400">
              {pendingPosts.length} pending
            </span>
          )}
        </h1>

        {pendingPosts.length === 0 ? (
          <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-8 text-center text-gray-500">
            No posts pending review.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingPosts.map((post) => (
              <PostReviewRow key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* ── Deletion Requests ───────────────────────────────────────────────── */}
      {deletionPosts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            Deletion Requests
            <span className="ml-3 text-sm font-normal text-orange-400">
              {deletionPosts.length} pending
            </span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Authors have requested these published posts be removed.
          </p>
          <div className="flex flex-col gap-4">
            {deletionPosts.map((post) => (
              <DeletionRequestRow key={post._id} post={post} />
            ))}
          </div>
        </div>
      )}

      {/* ── Published Posts ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">
          Published Posts
          {publishedPosts.length > 0 && (
            <span className="ml-3 text-sm font-normal text-green-400">
              {publishedPosts.length} live
            </span>
          )}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          All currently approved and published posts.
        </p>

        {publishedPosts.length === 0 ? (
          <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-8 text-center text-gray-500">
            No published posts yet.
          </div>
        ) : (
          <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Author</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Published</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {publishedPosts.map((post) => (
                    <PublishedPostRow
                      key={post._id}
                      postId={post._id}
                      title={post.title}
                      authorName={post.author?.name ?? "Unknown"}
                      category={post.category?.title ?? "—"}
                      publishedAt={post.publishedAt ?? null}
                      updatedAt={post._updatedAt}
                      hidden={post.status === "hidden"}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
