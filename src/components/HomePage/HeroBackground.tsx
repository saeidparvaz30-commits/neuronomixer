import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

function HeroBackground() {
  const { scrollY } = useScroll();

  // Move background slower than scroll (parallax)
  const y = useTransform(scrollY, [0, 500], [0, 100]); // tweak second value for stronger effect
  const scale = useTransform(scrollY, [0, 500], [1, 1.1]); // slight zoom as you scroll

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
        className="object-cover object-center"
      />
      {/* Optional dark overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
    </motion.div>
  );
}

export default HeroBackground;
