"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import CategoryCard from "./CategoryCard";

export type Category = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  image?: { asset?: { url: string } };
  active?: boolean;
  intuitive?: boolean;
};

export default function AnimatedCategories({
  categories,
}: {
  categories: Category[];
}) {
  const [selected, setSelected] = useState<Category | null>(null);
  const [animStyle, setAnimStyle] = useState<React.CSSProperties>({});
  const router = useRouter();
  const clickedSlugRef = useRef<string | null>(null);

  const visibleCategories = categories.filter((cat) => cat.active !== false);

  const handleClick = (cat: Category, el: HTMLDivElement | null) => {
    if (clickedSlugRef.current) return;
    if (el) {
      const r = el.getBoundingClientRect();
      setAnimStyle({
        position: "fixed",
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        borderRadius: 16,
        zIndex: 100,
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    clickedSlugRef.current = cat.slug.current;
    setSelected(cat);
  };

  const goToCategory = () => {
    if (clickedSlugRef.current) router.push(`/blog/${clickedSlugRef.current}`);
  };

  return (
    <AnimatePresence>
      {!selected && (
        <>
          {visibleCategories.map((c) => (
            <motion.div
              key={c._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.35 }}
              onClick={(e) => handleClick(c, e.currentTarget)}
            >
              <CategoryCard category={c} />
            </motion.div>
          ))}

        </>
      )}

      {selected && (
        <motion.div
          style={animStyle}
          animate={{
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            borderRadius: 0,
          }}
          transition={{ duration: 0.75, ease: [0.6, 0.01, -0.05, 0.95] }}
          onAnimationComplete={goToCategory}
          className="overflow-hidden shadow-xl"
        >
          {/* Background image */}
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${selected.image?.asset?.url || "/fallback.jpg"})`,
            }}
            animate={{ scale: 1.05 }}
            transition={{ duration: 1.2 }}
          />

          {/* Dark overlay + text */}
          <motion.div className="absolute inset-0 flex flex-col justify-center items-center text-center p-10 bg-gradient-to-t from-black/70 to-black/20">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.25 }}
              className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg"
            >
              {selected.title}
            </motion.h2>

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "40%", opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.3, ease: "easeOut" }}
              className="h-[3px] bg-[var(--color-accent)] rounded-full mt-4 mx-auto"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
