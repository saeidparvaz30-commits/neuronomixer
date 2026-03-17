"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

function HeroBackground() {
  const { scrollY } = useScroll();

  const y = useTransform(scrollY, [0, 500], [0, 100]);
  const scale = useTransform(scrollY, [0, 500], [1, 1.1]);

  return (
    <motion.div
      style={{ y, scale }}
      className="absolute inset-0 will-change-transform"
    >
      <Image
        src="/pictures/norway-landscape.jpg"
        alt="Norwegian landscape background"
        fill
        priority
        sizes="100vw"
        quality={80}
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
    </motion.div>
  );
}

export default HeroBackground;
