import { client } from "@/sanity/lib/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AuthorCard, { Author } from "@/components/author/AuthorCard";
import AuthorSignupForm from "@/components/author/AuthorSignupForm";

const query = `
  *[_type == "author" && applicationStatus == "approved"] | order(order asc) {
    _id,
    name,
    slug,
    image { asset->{ url } },
    shortBio,
    longBio,
    jobTitle,
    employer,
    education,
    linkedIn,
    github,
    twitter,
    personalWebsite,
    email
  }
`;

export const revalidate = 60;

export default async function AuthorsPage() {
  const session = await auth();

  const authors: Author[] = await client.fetch(query);

  let followedIds = new Set<string>();
  if (session?.user) {
    const follows = await prisma.follow.findMany({
      where: { userId: session.user.id, type: "author" },
      select: { sanityId: true },
    });
    followedIds = new Set(follows.map((f) => f.sanityId));
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16">
      {/* Responsive title */}
      <h1
        className="
          text-3xl sm:text-4xl md:text-5xl font-bold
          mb-10 sm:mb-14 text-center
          text-[var(--color-text)]
        "
      >
        NeuroNomixer <span className="text-[var(--color-accent)]">Authors</span>{" "}
        & Contributors
      </h1>

      {/* Responsive grid */}
      <div
        className="
          grid grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-3
          gap-8 sm:gap-10 lg:gap-12
        "
      >
        {authors.map((author, i) => (
          <AuthorCard
            key={author._id}
            author={author}
            index={i}
            isFollowing={followedIds.has(author._id)}
            isLoggedIn={!!session?.user}
          />
        ))}
      </div>

      {/* Signup form (optional, bottom) */}
      <div className="mt-16">
        <AuthorSignupForm />
      </div>
    </section>
  );
}
