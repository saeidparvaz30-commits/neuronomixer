import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";

export default async function BookmarksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Bookmark size={20} className="text-[var(--color-accent)]" />
        <h2 className="text-lg font-semibold text-white">Saved Posts</h2>
        {bookmarks.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-gray-300">
            {bookmarks.length}
          </span>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark size={40} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 mb-2">No saved posts yet.</p>
          <p className="text-sm text-gray-500">
            Bookmark articles while reading to find them here.
          </p>
          <Link
            href="/blog"
            className="inline-block mt-6 px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors"
          >
            Browse articles
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookmarks.map((b) => (
            <li key={b.id}>
              <Link
                href={`/blog/${b.categorySlug}/${b.postSlug}`}
                className="flex items-start justify-between gap-4 px-4 py-3.5 rounded-xl bg-[#060d18]/80 border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                    {b.postTitle}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">
                    {b.categorySlug.replace(/-/g, " ")} ·{" "}
                    {new Date(b.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <ExternalLink
                  size={14}
                  className="shrink-0 mt-0.5 text-gray-500 group-hover:text-[var(--color-accent)] transition-colors"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
