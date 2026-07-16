"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, LogOut, LayoutDashboard, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import NnxLogo from "./NnxLogo";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastScrollY = useRef(0);
  const hoverReveal = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

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
        setAvatarOpen(false);
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

    const handleClickOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 999;
      if (y < 40 && lastScrollY.current > 60) {
        clearHideTimer();
        hoverReveal.current = true;
        setVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("mousedown", handleClickOutside);
      clearHideTimer();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/notifications")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setUnreadCount(data.unreadCount ?? 0); })
      .catch(() => {});
  }, [session?.user]);

  const links = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/visual-guides", label: "Visual Guides" },
    { href: "/authors", label: "Authors" },
    { href: "/contact", label: "Contact" },
  ];

  const role = session?.user?.role;
  const dashboardHref =
    role === "ADMIN"
      ? "/dashboard/admin"
      : role === "AUTHOR"
      ? "/dashboard/author"
      : "/dashboard/subscriber";

  return (
    <motion.nav
      animate={{ y: visible ? 0 : "-120%" }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 w-full z-50 pointer-events-none"
    >
      <div className="max-w-[1400px] mx-auto px-6 pt-3 pointer-events-auto">

        {/* ── Glassmorphism floating pill ── */}
        <div className="relative flex items-center justify-between px-4 py-2
                        bg-[#060d18]/90 backdrop-blur-md
                        rounded-2xl
                        border border-[var(--color-accent)]/30
                        shadow-[0_4px_32px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)]
                        overflow-visible">

          {/* Gradient bottom accent line */}
          <div className="absolute bottom-0 left-[8%] right-[8%] h-px
                          bg-gradient-to-r from-transparent via-[var(--color-accent)]/60 to-transparent
                          pointer-events-none" />

          {/* Logo + Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="transition-transform duration-300 group-hover:scale-105">
              <NnxLogo size={50} />
            </span>
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

          {/* Right side: avatar or sign-in */}
          <div className="hidden md:flex items-center gap-2">
            {session?.user ? (
              <>
                {/* Notification bell */}
                <Link
                  href={dashboardHref + "/notifications"}
                  className="relative p-1.5 text-white/60 hover:text-white transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  )}
                </Link>
              <div ref={avatarRef} className="relative">
                <button
                  onClick={() => setAvatarOpen(!avatarOpen)}
                  className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a]"
                  aria-label="User menu"
                >
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                      width={34}
                      height={34}
                      className="rounded-full border-2 border-[var(--color-accent)]/50 hover:border-[var(--color-accent)] transition-colors"
                    />
                  ) : (
                    <div className="w-[34px] h-[34px] rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold border-2 border-[var(--color-accent)]/50">
                      {session.user.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}
                </button>

                <AnimatePresence>
                  {avatarOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-[calc(100%+10px)] w-48
                                 bg-[#060d18] border border-[var(--color-accent)]/30
                                 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)]
                                 py-1 z-[100]"
                    >
                      <div className="px-3 py-2 border-b border-white/10">
                        <p className="text-xs font-medium text-white line-clamp-1">
                          {session.user.name}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {session.user.email}
                        </p>
                      </div>
                      <Link
                        href={dashboardHref}
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LayoutDashboard size={14} />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { setAvatarOpen(false); signOut({ callbackUrl: "/" }); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/sign-in"
                  className="px-4 py-1.5 text-sm font-medium
                             text-white/70 hover:text-white
                             transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="px-4 py-1.5 text-sm font-medium
                             bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80
                             text-[#0f172a]
                             rounded-lg transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

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

              <div className="border-t border-white/10 pt-2 mt-1">
                {session?.user ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <LayoutDashboard size={14} />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { setIsOpen(false); signOut({ callbackUrl: "/" }); }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-1">
                    <Link
                      href="/auth/sign-up"
                      onClick={() => setIsOpen(false)}
                      className="block text-center py-2.5 rounded-xl text-sm font-semibold
                                 bg-[var(--color-accent)] text-[#0f172a]
                                 hover:bg-[var(--color-accent)]/80 transition-colors"
                    >
                      Sign Up
                    </Link>
                    <Link
                      href="/auth/sign-in"
                      onClick={() => setIsOpen(false)}
                      className="block text-center py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.nav>
  );
}
