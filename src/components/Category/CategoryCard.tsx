"use client";
import Image from "next/image";
import { motion } from "framer-motion";

export default function CategoryCard({
  category,
  onClick,
  isSelected = false,
}: {
  category: any;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-full text-left rounded-2xl overflow-hidden shadow-lg
                 ring-1 ring-[var(--color-accent)]/30 hover:scale-[1.02]
                 transition-transform duration-300 focus:outline-none mb-3"
    >
      <Image
        src={category.image?.asset?.url || "/fallback.jpg"}
        alt={category.title}
        width={1200}
        height={600}
        className="object-cover w-full h-[280px]"
      />
      <motion.div
        animate={
          isSelected ? { scale: 0.9, x: -40, y: 30 } : { scale: 1, x: 0, y: 0 }
        }
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center p-5"
      >
        <h2 className="text-4xl font-extrabold text-white mb-2">
          {category.title}
        </h2>
        <p className="text-base text-gray-200 max-w-xl">
          {category.description}
        </p>
      </motion.div>
    </button>
  );
}
