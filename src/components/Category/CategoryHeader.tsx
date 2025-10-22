"use client";
import { motion } from "framer-motion";

export default function CategoryHeader({
  category,
  onSettled,
}: {
  category: any;
  onSettled?: () => void;
}) {
  return (
    <motion.div
      layoutId={`category-${category.slug.current}`} // must match card layoutId
      className="relative w-full rounded-2xl overflow-hidden ring-1 ring-[var(--color-accent)]/40"
      transition={{ duration: 0.8, ease: [0.6, 0.01, -0.05, 0.95] }}
      onLayoutAnimationComplete={onSettled}
    >
      <div
        className="h-56 sm:h-64 md:h-72 w-full bg-cover bg-center"
        style={{
          backgroundImage: `url(${category.image?.asset?.url || "/fallback.jpg"})`,
        }}
      />
      <div className="absolute inset-0 bg-black/45 flex items-end">
        <div className="p-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">
            {category.title}
          </h1>
          {/* animated gold underline */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="h-[3px] mt-3 bg-[var(--color-accent)]/80 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
