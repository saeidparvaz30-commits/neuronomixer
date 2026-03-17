"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const hoverReveal = useRef(false);  // true when visibility was triggered by hover, not scroll
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY < 60) {
        clearHideTimer();
        hoverReveal.current = false;
        setVisible(true);
      } else if (currentY < lastScrollY.current) {
        // Scrolling up → show (scroll controls it, not hover)
        clearHideTimer();
        hoverReveal.current = false;
        setVisible(true);
      } else if (currentY > lastScrollY.current + 5) {
        // Scrolling down → hide
        clearHideTimer();
        hoverReveal.current = false;
        setVisible(false);
        setIsOpen(false);
      }

      lastScrollY.current = currentY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 8) {
        // Near top edge — only activate hover-reveal if we're actually scrolled down
        if (lastScrollY.current > 60) {
          clearHideTimer();
          hoverReveal.current = true;
          setVisible(true);
        }
      } else if (hoverReveal.current && e.clientY > 90) {
        // Mouse moved well past the navbar area while hover-revealed → start hide timer
        if (!hideTimer.current) {
          hideTimer.current = setTimeout(() => {
            if (hoverReveal.current) {
              setVisible(false);
              hoverReveal.current = false;
            }
            hideTimer.current = null;
          }, 800);
        }
      } else if (hoverReveal.current && e.clientY <= 90) {
        // Mouse is still over navbar area — cancel any pending hide
        clearHideTimer();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      clearHideTimer();
    };
  }, []);

  const links = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/authors", label: "Authors" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <motion.nav
      animate={{ y: visible ? 0 : "-120%" }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 w-full z-50 pointer-events-none"
    >
      <div className="max-w-7xl mx-auto px-4 pt-3 pointer-events-auto">

        {/* ── Glassmorphism floating pill ── */}
        <div className="relative flex items-center justify-between px-4 py-2
                        bg-[#060d18]/90 backdrop-blur-md
                        rounded-2xl
                        border border-[var(--color-accent)]/30
                        shadow-[0_4px_32px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)]
                        overflow-hidden">

          {/* Gradient bottom accent line */}
          <div className="absolute bottom-0 left-[8%] right-[8%] h-px
                          bg-gradient-to-r from-transparent via-[var(--color-accent)]/60 to-transparent
                          pointer-events-none" />

          {/* Logo + Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/pictures/Logo.png"
              alt="NeuroNomixer logo"
              width={50}
              height={50}
              sizes="50px"
              quality={85}
              className="rounded-full transition-transform duration-300 group-hover:scale-105"
              priority
            />
            <span className="text-lg font-semibold text-white tracking-wide
                             transition-colors duration-200
                             group-hover:text-[var(--color-accent)]">
              NeuroNomixer
            </span>
          </Link>

          {/* Desktop links — sliding underline indicator */}
          <ul className="hidden md:flex items-center gap-1">
            {links.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <li key={href} className="relative">
                  <Link
                    href={href}
                    className={`block px-4 py-2 pb-3 text-sm font-medium
                                transition-colors duration-200
                                ${isActive
                                  ? "text-[var(--color-accent)]"
                                  : "text-white/75 hover:text-white"
                                }`}
                  >
                    {label}
                  </Link>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-1 left-3 right-3 h-[2px] rounded-full bg-[var(--color-accent)]"
                      style={{ boxShadow: "0 0 8px var(--color-accent)" }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {/* Mobile burger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            className="md:hidden text-white/75 hover:text-[var(--color-accent)]
                       transition-colors duration-200 p-1"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="mt-2
                         bg-[#060d18]/95 backdrop-blur-md
                         border border-[var(--color-accent)]/30
                         rounded-2xl
                         shadow-[0_8px_32px_rgba(0,0,0,0.7)]
                         px-4 py-3 space-y-1"
            >
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`block text-center py-2.5 rounded-xl text-base
                              transition-colors duration-200
                              ${pathname === href
                                ? "text-[var(--color-accent)] bg-[var(--color-accent)]/10 font-semibold"
                                : "text-white/75 hover:text-[var(--color-accent)] hover:bg-white/5"
                              }`}
                >
                  {label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.nav>
  );
}
