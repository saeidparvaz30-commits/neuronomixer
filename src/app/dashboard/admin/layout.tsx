import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, FileText, BookOpen } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if ((session?.user as any)?.role !== "ADMIN") {
    redirect("/auth/sign-in");
  }

  const navItems = [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/authors", label: "Authors", icon: Users },
    { href: "/dashboard/admin/posts", label: "Posts", icon: FileText },
    { href: "/dashboard/admin/users", label: "All Users", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] flex pt-24">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/10 px-4 py-6 gap-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
          Admin
        </p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
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

      {/* Main content */}
      <main className="flex-1 px-6 py-8 max-w-5xl">{children}</main>
    </div>
  );
}
