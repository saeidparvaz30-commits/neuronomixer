"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const list = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.085, delayChildren: 0.15 },
  },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
};

export default function PostList({
  categorySlug,
  posts,
  intuitive,
}: {
  categorySlug: string;
  posts: Post[];
  intuitive: boolean;
}) {
  const [visited, setVisited] = useState<Record<string, true>>({});

  useEffect(() => {
    const raw = localStorage.getItem("readPosts") || "[]";
    const ids: string[] = JSON.parse(raw);
    const m: Record<string, true> = {};
    ids.forEach((id) => (m[id] = true));
    setVisited(m);
  }, []);

  const markVisited = (id: string) => {
    const raw = localStorage.getItem("readPosts") || "[]";
    const ids: string[] = JSON.parse(raw);
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem("readPosts", JSON.stringify(ids));
    }
  };

  const wrapperClass = useMemo(
    () => `mt-8 ${intuitive ? "space-y-6" : "grid gap-6 sm:grid-cols-2"}`,
    [intuitive]
  );

  return (
    <motion.ul
      variants={list}
      initial="hidden"
      animate="show"
      className={wrapperClass}
    >
      {posts?.map((post, i) => {
        const isRead = visited[post._id];
        return (
          <motion.li key={post._id} variants={item}>
            {intuitive ? (
              <Link
                href={`/blog/${categorySlug}/${post.slug.current}`}
                onClick={() => markVisited(post._id)}
                className="group block w-[75vw] mx-auto p-4 rounded-xl border border-[var(--color-accent)]/40
                           hover:bg-[var(--color-primary)]/10 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="mt-0 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center
                                   rounded-full bg-[var(--color-accent)] text-[var(--background)]
                                   font-bold"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      className={`text-lg sm:text-xl font-semibold leading-snug break-words whitespace-normal 
                        ${
                          isRead
                            ? "text-[var(--color-secondary)]"
                            : "group-hover:text-[var(--color-secondary)]"
                        }`}
                    >
                      {post.title}
                    </h2>
                    {post.description && (
                      <p className="text-sm text-[var(--color-text-muted)] mt-1 break-words">
                        {post.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ) : (
              <Link
                href={`/blog/${categorySlug}/${post.slug.current}`}
                onClick={() => markVisited(post._id)}
                className="block p-5 rounded-xl border border-[var(--color-accent)]/30
                           hover:bg-[var(--color-primary)]/10 transition-colors h-full"
              >
                <h3
                  className={`text-base sm:text-lg font-bold mb-1 leading-snug break-words whitespace-normal 
                    ${isRead ? "text-[var(--color-secondary)]" : ""}`}
                >
                  {post.title}
                </h3>
                {post.description && (
                  <p className="text-sm text-[var(--color-text-muted)] break-words">
                    {post.description}
                  </p>
                )}
              </Link>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
