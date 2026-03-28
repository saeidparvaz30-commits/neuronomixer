import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clock } from "lucide-react";

export default async function ReadingHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");

  const history = await prisma.readingHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { readAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Clock size={18} className="text-[var(--color-accent)]" />
        <h2 className="text-lg font-semibold text-white">Reading History</h2>
        {history.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">{history.length} articles</span>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-10 text-center">
          <Clock size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 font-medium">No reading history yet</p>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            Articles you read will appear here automatically.
          </p>
          <Link
            href="/blog"
            className="px-4 py-2 rounded-xl text-sm bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/30 transition-colors"
          >
            Browse Articles
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((entry) => (
            <Link
              key={entry.id}
              href={`/blog/${entry.categorySlug}/${entry.postSlug}`}
              className="flex items-start justify-between gap-4
                         bg-[#060d18]/80 border border-white/10 rounded-2xl p-5
                         hover:border-[var(--color-accent)]/40 transition-colors group"
            >
              <div className="min-w-0">
                <p className="font-medium text-white group-hover:text-[var(--color-accent)] transition-colors line-clamp-1">
                  {entry.postTitle}
                </p>
                {entry.authorName && (
                  <p className="text-xs text-gray-500 mt-0.5">by {entry.authorName}</p>
                )}
              </div>
              <time className="text-xs text-gray-600 shrink-0 pt-0.5">
                {new Date(entry.readAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
