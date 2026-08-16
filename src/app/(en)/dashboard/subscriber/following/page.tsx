import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { Users } from "lucide-react";
import UnfollowButton from "./UnfollowButton";

interface SanityAuthor {
  _id: string;
  name: string;
  slug: { current: string };
  image?: { asset: { url: string } };
}

interface SanityCategory {
  _id: string;
  title: string;
  slug: { current: string };
}

export default async function FollowingPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");

  const follows = await prisma.follow.findMany({
    where: { userId: session.user.id },
    orderBy: { id: "asc" },
  });

  const authorFollows = follows.filter((f) => f.type === "author");
  const categoryFollows = follows.filter((f) => f.type === "category");

  // Fetch Sanity data for followed items
  const [authors, categories] = await Promise.all([
    authorFollows.length > 0
      ? client.fetch<SanityAuthor[]>(
          `*[_type == "author" && _id in $ids] { _id, name, slug, image { asset->{ url } } }`,
          { ids: authorFollows.map((f) => f.sanityId) }
        )
      : [],
    categoryFollows.length > 0
      ? client.fetch<SanityCategory[]>(
          `*[_type == "category" && _id in $ids] { _id, title, slug }`,
          { ids: categoryFollows.map((f) => f.sanityId) }
        )
      : [],
  ]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Users size={18} className="text-[var(--color-accent)]" />
        <h2 className="text-lg font-semibold text-white">Following</h2>
        <span className="ml-auto text-xs text-gray-500">
          {follows.length} {follows.length === 1 ? "subscription" : "subscriptions"}
        </span>
      </div>

      {follows.length === 0 ? (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-10 text-center">
          <Users size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 font-medium">Not following anyone yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Visit author pages or category pages and hit Follow.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Authors */}
          {authors.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Authors
              </h3>
              <div className="flex flex-col gap-2">
                {authors.map((author) => (
                  <div
                    key={author._id}
                    className="flex items-center justify-between gap-4
                               bg-[#060d18]/80 border border-white/10 rounded-2xl px-5 py-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {author.image?.asset?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={author.image.asset.url}
                          alt={author.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {author.name[0]}
                        </div>
                      )}
                      <span className="text-sm text-white font-medium truncate">
                        {author.name}
                      </span>
                    </div>
                    <UnfollowButton type="author" sanityId={author._id} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Categories
              </h3>
              <div className="flex flex-col gap-2">
                {categories.map((cat) => (
                  <div
                    key={cat._id}
                    className="flex items-center justify-between gap-4
                               bg-[#060d18]/80 border border-white/10 rounded-2xl px-5 py-4"
                  >
                    <span className="text-sm text-white font-medium">{cat.title}</span>
                    <UnfollowButton type="category" sanityId={cat._id} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
