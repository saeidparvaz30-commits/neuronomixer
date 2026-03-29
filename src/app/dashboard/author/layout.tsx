import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, PenSquare, FileText, Lightbulb, UserCircle } from "lucide-react";

export default async function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "AUTHOR" && role !== "ADMIN") {
    redirect("/auth/sign-in");
  }

  const navItems = [
    { href: "/dashboard/author", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/author/submit", label: "Submit Post", icon: PenSquare },
    { href: "/dashboard/author/posts", label: "My Posts", icon: FileText },
    { href: "/dashboard/author/suggest-category", label: "Suggest Category", icon: Lightbulb },
  ];

  const navLink = "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors";

  return (
    <div className="min-h-screen bg-[var(--background)] flex pt-24">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/10 px-4 py-6 gap-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
          Author
        </p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={navLink}>
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mt-6 mb-3">
          Account
        </p>
        <Link href="/dashboard/author/profile" className={navLink}>
          <UserCircle size={16} />
          Profile
        </Link>
      </aside>

      <main className="flex-1 px-6 py-8 max-w-5xl">{children}</main>
    </div>
  );
}
