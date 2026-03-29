"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PenSquare, FileText, Lightbulb, UserCircle, Bell, FileUser, type LucideIcon } from "lucide-react";

const authorItems: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/dashboard/author", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/author/submit", label: "Submit Post", icon: PenSquare },
  { href: "/dashboard/author/posts", label: "My Posts", icon: FileText },
  { href: "/dashboard/author/suggest-category", label: "Suggest Category", icon: Lightbulb },
  { href: "/dashboard/author/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/author/cv", label: "CV Builder", icon: FileUser },
];

const accountItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/author/profile", label: "Profile", icon: UserCircle },
];

export default function AuthorSidebarNav() {
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
        Author
      </p>
      {authorItems.map(({ href, label, icon: Icon, exact }) => (
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
    </aside>
  );
}
