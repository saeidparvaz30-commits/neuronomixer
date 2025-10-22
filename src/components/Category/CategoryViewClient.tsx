"use client";
import { motion } from "framer-motion";
import PostList from "@/components/Category/PostList";

export default function CategoryViewClient({ category }: { category: any }) {
  const imageUrl = category?.image?.asset?.url || "/fallback.jpg";

  return (
    <main className="max-w-6xl  mx-auto py-0">
      {/* header matches AnimatedCategories target geometry */}
      <div className="relative w-[80vw] max-w-[1200px] mx-auto mt-[30px] h-[280px] overflow-hidden rounded-2xl shadow-xl rounded-2xl ring-1 ring-[var(--color-accent)]/30 border border-[var(--color-accent)]/20 bg-[var(--background)]">
        <div
          className="absolute inset-0 bg-cover bg-center "
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className="absolute inset-0 flex flex-col justify-center text-center p-10 bg-gradient-to-t from-[rgba(0,0,0,0.4)] to-transparent">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mt-20">
            {category.title}
          </h1>
          <div className="h-[3px] bg-[var(--color-accent)] rounded-full mt-1 w-[100%] mx-auto" />
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
