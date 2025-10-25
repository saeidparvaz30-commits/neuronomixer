// Navigation bar for the application
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/authors", label: "Authors" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-[var(--color-accent)] shadow-sm bg-[var(--background)] bg-opacity-95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-3 py-2">
        {/* Logo + Title */}
        <Link
          href="/"
          className="hover:text-[var(--color-accent)] transition-colors duration-200 text-lg font-bold flex items-center space-x-2"
        >
          <Image
            src="/pictures/Logo.png"
            alt="NeuroNomixer logo"
            width={60}
            height={60}
            className="rounded-full"
            priority
          />
          <span className="text-xl font-semibold text-white">NeuroNomixer</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex space-x-6">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`transition-colors duration-200 ${
                  pathname === href
                    ? "text-[var(--color-accent)] font-semibold"
                    : "text-white hover:text-[var(--color-accent)]"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile burger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-white hover:text-[var(--color-accent)] transition-colors duration-200"
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[var(--background)] border-t border-[var(--color-accent)] shadow-md px-6 py-3 space-y-2"
          >
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`block text-center py-2 text-lg transition-colors duration-200 ${
                  pathname === href
                    ? "text-[var(--color-accent)] font-semibold"
                    : "text-white hover:text-[var(--color-accent)]"
                }`}
              >
                {label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
