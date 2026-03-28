import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CompleteSignupForm from "./CompleteSignupForm";

export default async function CompleteSignupPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // Check DB directly so we don't act on a stale JWT
  const { prisma } = await import("@/lib/prisma");
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true, role: true },
  });

  if (dbUser?.onboarded) {
    const role = dbUser.role;
    redirect(
      role === "ADMIN"
        ? "/dashboard/admin"
        : role === "AUTHOR"
        ? "/dashboard/author"
        : "/dashboard/subscriber"
    );
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center -mt-24 py-16 px-4">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-[var(--color-accent)]/10" />

      <div className="relative z-10 w-full max-w-xl">
        <div
          className="
            bg-[#060d18]/90 backdrop-blur-md
            border border-[var(--color-accent)]/30
            rounded-2xl
            shadow-[0_8px_40px_rgba(0,0,0,0.7)]
            p-8 md:p-10
          "
        >
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              Complete Your Profile
            </h1>
            <p className="text-sm text-gray-400">
              Tell us a bit about yourself to get started.
            </p>
          </div>

          <CompleteSignupForm
            userEmail={session.user.email ?? ""}
            userName={session.user.name ?? ""}
          />
        </div>
      </div>
    </section>
  );
}
