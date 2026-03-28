import { client } from "@/sanity/lib/client";
import AuthorApplicationRow from "./AuthorApplicationRow";

interface SanityAuthor {
  _id: string;
  name: string;
  email?: string;
  shortBio?: string;
  userId?: string;
}

async function getPendingAuthors(): Promise<SanityAuthor[]> {
  return client.fetch(
    `*[_type == "author" && applicationStatus == "pending"] | order(_createdAt asc) {
      _id, name, email, shortBio, userId
    }`
  );
}

export default async function AdminAuthorsPage() {
  const authors = await getPendingAuthors();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Author Applications</h1>

      {authors.length === 0 ? (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-8 text-center text-gray-500">
          No pending author applications.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {authors.map((author) => (
            <AuthorApplicationRow key={author._id} author={author} />
          ))}
        </div>
      )}
    </div>
  );
}
