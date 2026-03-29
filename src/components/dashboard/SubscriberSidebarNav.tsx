"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Clock, Settings, Rss, UserCircle, Bookmark, Bell, type LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/dashboard/subscriber", label: "Feed", icon: Rss, exact: true },
  { href: "/dashboard/subscriber/history", label: "Reading History", icon: Clock },
  { href: "/dashboard/subscriber/following", label: "Following", icon: Users },
  { href: "/dashboard/subscriber/bookmarks", label: "Saved Posts", icon: Bookmark },
  { href: "/dashboard/subscriber/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/subscriber/profile", label: "Profile", icon: UserCircle },
  { href: "/dashboard/subscriber/settings", label: "Settings", icon: Settings },
];

export default function SubscriberSidebarNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-52 shrink-0">
        <nav className="flex flex-col gap-1 bg-[#060d18]/80 border border-white/10 rounded-2xl p-3">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden w-full mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/30 font-medium"
                    : "text-gray-400 hover:text-white bg-[#060d18]/80 border border-white/10"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
