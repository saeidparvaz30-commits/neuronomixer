"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import CategoryCard from "./CategoryCard";
import SubscribeBox from "@/components/appSkeleton/SubscribeBox";

export default function AnimatedCategories({
  categories,
}: {
  categories: any[];
}) {
  const [selected, setSelected] = useState<any>(null);
  const [animStyle, setAnimStyle] = useState<React.CSSProperties>({});
  const router = useRouter();
  const clickedSlugRef = useRef<string | null>(null);

  // ✅ Filter only active categories
  const visibleCategories = categories.filter((cat) => cat.active !== false);

  const handleClick = (cat: any, el: HTMLDivElement | null) => {
    if (clickedSlugRef.current) return;
    if (el) {
      const r = el.getBoundingClientRect();
      const navbar = document.querySelector("nav");
      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;

      setAnimStyle({
        position: "absolute",
        top: navbarHeight + 30,
        left: r.left,
        width: r.width,
        height: r.height,
        zIndex: 50,
      });
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    clickedSlugRef.current = cat.slug.current;
    setSelected(cat);
  };

  const goToCategory = () => {
    if (clickedSlugRef.current) router.push(`/blog/${clickedSlugRef.current}`);
    console.log("navigating to", clickedSlugRef.current);
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

          {/* ✅ One SubscribeBox at the very end */}
          <div className="mt-20">
            <SubscribeBox />
          </div>
        </>
      )}

      {selected && (
        <motion.div
          style={animStyle}
          transition={{ duration: 0.9, ease: [0.6, 0.01, -0.05, 0.95] }}
          className="overflow-hidden shadow-xl rounded-2xl ring-1 ring-[var(--color-accent)]/30 border border-[var(--color-accent)]/20 bg-[var(--background)]"
        >
          {/* Background */}
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${selected.image?.asset?.url || "/fallback.jpg"})`,
            }}
            animate={{ scale: 1.05 }}
            transition={{ duration: 1 }}
          />

          {/* Text overlay */}
          <motion.div className="absolute inset-0 flex flex-col justify-center text-center p-10 bg-gradient-to-t from-[rgba(0,0,0,0.4)] to-transparent">
            <motion.h2
              variants={{
                initial: { x: 0, y: 0, scale: 1 },
                moved: { x: 0, y: 40, scale: 1.05 },
              }}
              initial="initial"
              animate="moved"
              transition={{
                duration: 0.8,
                ease: "easeOut",
                delay: 0.6,
              }}
              className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mt-10"
            >
              {selected.title}
            </motion.h2>

            {/* Gold underline */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "50%", opacity: 1 }}
              transition={{
                delay: 0.9,
                duration: 0.5,
                ease: "easeOut",
              }}
              onAnimationComplete={goToCategory}
              className="h-[3px] bg-[var(--color-accent)] rounded-full mt-11 mx-auto"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
