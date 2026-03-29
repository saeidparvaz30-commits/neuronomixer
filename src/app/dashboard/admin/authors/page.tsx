import { client } from "@/sanity/lib/client";
import AuthorApplicationRow from "./AuthorApplicationRow";
import ApprovedAuthorRow from "./ApprovedAuthorRow";

interface SanityAuthor {
  _id: string;
  name: string;
  email?: string;
  shortBio?: string;
  userId?: string;
}

interface ApprovedAuthor {
  _id: string;
  name: string;
  email?: string;
  postCount: number;
}

async function getPendingAuthors(): Promise<SanityAuthor[]> {
  return client.fetch(
    `*[_type == "author" && applicationStatus == "pending"] | order(_createdAt asc) {
      _id, name, email, shortBio, userId
    }`
  );
}

async function getApprovedAuthors(): Promise<ApprovedAuthor[]> {
  const authors = await client.fetch<{ _id: string; name: string; email?: string }[]>(
    `*[_type == "author" && applicationStatus == "approved"] | order(name asc) {
      _id, name, email
    }`
  );
  // Count published posts per author
  const withCounts = await Promise.all(
    authors.map(async (a) => {
      const count = await client.fetch<number>(
        `count(*[_type == "post" && references($id)])`,
        { id: a._id }
      );
      return { ...a, postCount: count };
    })
  );
  return withCounts;
}

export default async function AdminAuthorsPage() {
  const [pendingAuthors, approvedAuthors] = await Promise.all([
    getPendingAuthors(),
    getApprovedAuthors(),
  ]);

  return (
    <div className="space-y-10">

      {/* ── Pending Applications ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">
          Author Applications
          {pendingAuthors.length > 0 && (
            <span className="ml-3 text-sm font-normal text-yellow-400">
              {pendingAuthors.length} pending
            </span>
          )}
        </h1>

        {pendingAuthors.length === 0 ? (
          <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-8 text-center text-gray-500">
            No pending author applications.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingAuthors.map((author) => (
              <AuthorApplicationRow key={author._id} author={author} />
            ))}
          </div>
        )}
      </div>

      {/* ── Approved Authors ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">
          Approved Authors
          <span className="ml-3 text-sm font-normal text-green-400">
            {approvedAuthors.length} active
          </span>
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Removing an author deletes their public profile. Their posts are kept.
        </p>

        {approvedAuthors.length === 0 ? (
          <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-8 text-center text-gray-500">
            No approved authors yet.
          </div>
        ) : (
          <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Posts</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {approvedAuthors.map((author) => (
                  <ApprovedAuthorRow
                    key={author._id}
                    authorId={author._id}
                    name={author.name}
                    email={author.email}
                    postCount={author.postCount}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
