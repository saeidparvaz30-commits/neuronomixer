import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, FileText, BookOpen, PenSquare, Lightbulb, Tag, UserCircle } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if ((session?.user as any)?.role !== "ADMIN") {
    redirect("/auth/sign-in");
  }

  const adminItems = [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/authors", label: "Authors", icon: Users },
    { href: "/dashboard/admin/posts", label: "Posts", icon: FileText },
    { href: "/dashboard/admin/categories", label: "Categories", icon: Tag },
    { href: "/dashboard/admin/users", label: "All Users", icon: BookOpen },
  ];

  const writingItems = [
    { href: "/dashboard/admin/submit", label: "Submit Post", icon: PenSquare },
    { href: "/dashboard/admin/my-posts", label: "My Posts", icon: FileText },
    { href: "/dashboard/admin/suggest-category", label: "Suggest Category", icon: Lightbulb },
  ];

  const navLink = "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors";

  return (
    <div className="min-h-screen bg-[var(--background)] flex pt-24">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/10 px-4 py-6 gap-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
          Admin
        </p>
        {adminItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={navLink}>
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mt-6 mb-3">
          Writing
        </p>
        {writingItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={navLink}>
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mt-6 mb-3">
          Account
        </p>
        <Link href="/dashboard/admin/profile" className={navLink}>
          <UserCircle size={16} />
          Profile
        </Link>

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
