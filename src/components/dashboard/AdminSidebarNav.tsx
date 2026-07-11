"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, BookOpen, PenSquare, Lightbulb, Tag, UserCircle, Bell, FileUser, KeyRound, Rss, Clock, Bookmark, Settings, GraduationCap, BarChart2, FileUp, type LucideIcon } from "lucide-react";

const adminItems: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/admin/authors", label: "Authors", icon: Users },
  { href: "/dashboard/admin/posts", label: "Posts", icon: FileText },
  { href: "/dashboard/admin/categories", label: "Categories", icon: Tag },
  { href: "/dashboard/admin/visual-guides", label: "Visual Guides", icon: GraduationCap },
  { href: "/dashboard/admin/users", label: "All Users", icon: BookOpen },
  { href: "/dashboard/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/admin/token-usage", label: "Token Usage", icon: BarChart2 },
  { href: "/dashboard/admin/shared-pdfs", label: "Shared PDFs", icon: FileUp },
];

const writingItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/admin/submit", label: "Submit Post", icon: PenSquare },
  { href: "/dashboard/admin/my-posts", label: "My Posts", icon: FileText },
  { href: "/dashboard/admin/suggest-category", label: "Suggest Category", icon: Lightbulb },
  { href: "/dashboard/admin/cv", label: "CV Builder", icon: FileUser },
  { href: "/dashboard/admin/api-key", label: "API Access", icon: KeyRound },
];

const readerItems: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/dashboard/subscriber", label: "My Feed", icon: Rss, exact: true },
  { href: "/dashboard/subscriber/history", label: "Reading History", icon: Clock },
  { href: "/dashboard/subscriber/following", label: "Following", icon: Users },
  { href: "/dashboard/subscriber/bookmarks", label: "Saved Posts", icon: Bookmark },
  { href: "/dashboard/subscriber/settings", label: "Settings", icon: Settings },
];

const accountItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/admin/profile", label: "Profile", icon: UserCircle },
];

export default function AdminSidebarNav() {
  const pathname = usePathname();

  const linkClass = (href: string, exact?: boolean) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium"
        : "text-gray-400 hover:text-white hover:bg-white/5"
    }`;
  };

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/10 px-4 py-6 gap-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
        Admin
      </p>
      {adminItems.map(({ href, label, icon: Icon, exact }) => (
        <Link key={href} href={href} className={linkClass(href, exact)}>
          <Icon size={16} />
          {label}
        </Link>
      ))}

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mt-6 mb-3">
        Writing
      </p>
      {writingItems.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={linkClass(href)}>
          <Icon size={16} />
          {label}
        </Link>
      ))}

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mt-6 mb-3">
        Reader
      </p>
      {readerItems.map(({ href, label, icon: Icon, exact }) => (
        <Link key={href} href={href} className={linkClass(href, exact)}>
          <Icon size={16} />
          {label}
        </Link>
      ))}

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mt-6 mb-3">
        Account
      </p>
      {accountItems.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={linkClass(href)}>
          <Icon size={16} />
          {label}
        </Link>
      ))}

      <div className="mt-auto pt-6 border-t border-white/10">
        <a
          href="/studio"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
        >
          <BookOpen size={16} />
          Sanity Studio ↗
        </a>
      </div>
    </aside>
  );
}
