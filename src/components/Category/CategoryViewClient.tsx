"use client";
import { motion } from "framer-motion";
import PostList from "@/components/Category/PostList";
import type { Category } from "./AnimatedCategories";
import type { Post } from "./PostList";

type CategoryWithPosts = Category & { posts: Post[] };

export default function CategoryViewClient({ category }: { category: CategoryWithPosts }) {
  const imageUrl = category?.image?.asset?.url || "/fallback.jpg";

  return (
    <main className="max-w-6xl mx-auto py-0 px-4 sm:px-6">
      <div className="relative w-full mx-auto mt-8 h-[200px] sm:h-[280px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-[var(--color-accent)]/30 border border-[var(--color-accent)]/20 bg-[var(--background)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 bg-gradient-to-t from-black/60 to-transparent">
          <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">
            {category.title}
          </h1>
          <div className="h-[3px] bg-[var(--color-accent)] rounded-full mt-3 w-1/3 mx-auto" />
        </div>
      </div>

      {/* posts fade in */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <PostList
          categorySlug={category.slug.current}
          posts={category.posts || []}
          intuitive={!!category.intuitive}
        />
      </motion.div>
    </main>
  );
}
