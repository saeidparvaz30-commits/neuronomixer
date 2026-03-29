import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/dashboard/ProfileForm";

export default async function SubscriberProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const user = await (prisma as any).user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, bio: true, image: true },
  });

  if (!user) redirect("/auth/sign-in");

  return (
    <div>
      <h1 className="text-lg font-semibold text-white mb-6">Your Profile</h1>
      <ProfileForm
        name={user.name ?? ""}
        shortBio={user.bio ?? ""}
        email={user.email ?? ""}
        image={user.image ?? null}
      />
    </div>
  );
}
