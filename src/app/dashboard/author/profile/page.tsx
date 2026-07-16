import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import ProfileForm from "@/components/dashboard/ProfileForm";

type PortableTextBlock = { children?: { text: string }[] };

interface SanityAuthorProfile {
  imageUrl?: string;
  shortBio?: string;
  longBio?: PortableTextBlock[];
  jobTitle?: string;
  employer?: string;
  education?: string;
  linkedIn?: string;
  github?: string;
  twitter?: string;
  personalWebsite?: string;
  email?: string;
}

export default async function AuthorProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, sanityAuthorId: true },
  });

  if (!user) redirect("/auth/sign-in");

  let imageUrl = user.image ?? null;
  let sanityProfile: SanityAuthorProfile = {};

  if (user.sanityAuthorId) {
    const data = await client.fetch<SanityAuthorProfile | null>(
      `*[_type == "author" && _id == $id][0] {
        "imageUrl": image.asset->url,
        shortBio, longBio, jobTitle, employer, education,
        linkedIn, github, twitter, personalWebsite, email
      }`,
      { id: user.sanityAuthorId }
    );
    if (data) {
      sanityProfile = data;
      if (data.imageUrl) imageUrl = data.imageUrl;
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Your Profile</h1>
      <p className="text-sm text-gray-500 mb-8">
        Updates here sync to your public author page.
      </p>
      <ProfileForm
        name={user.name ?? ""}
        email={user.email ?? ""}
        image={imageUrl}
        shortBio={sanityProfile.shortBio ?? ""}
        longBio={sanityProfile.longBio?.map(b => b.children?.map(c => c.text).join("")).join("\n\n") ?? ""}
        jobTitle={sanityProfile.jobTitle ?? ""}
        employer={sanityProfile.employer ?? ""}
        education={sanityProfile.education ?? ""}
        linkedIn={sanityProfile.linkedIn ?? ""}
        github={sanityProfile.github ?? ""}
        twitter={sanityProfile.twitter ?? ""}
        personalWebsite={sanityProfile.personalWebsite ?? ""}
        contactEmail={sanityProfile.email ?? ""}
      />
    </div>
  );
}
