import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuthorSidebarNav from "@/components/dashboard/AuthorSidebarNav";

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

  return (
    <div className="min-h-screen bg-[var(--background)] flex pt-24">
      <AuthorSidebarNav />
      <main className="flex-1 px-6 py-8 max-w-5xl">{children}</main>
    </div>
  );
}
