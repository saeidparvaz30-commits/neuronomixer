import { client } from "@/sanity/lib/client";
import AuthorCard from "@/components/author/AuthorCard";
import AuthorSignupForm from "@/components/author/AuthorSignupForm";

const query = `
  *[_type == "author"] | order(order asc) {
    _id,
    name,
    slug,
    image { asset->{ url } },
    shortBio,
    longBio,
    linkedIn,
    github,
    twitter,
    personalWebsite,
    email
  }
`;

export const revalidate = 60;

export default async function AuthorsPage() {
  const authors = await client.fetch(query);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
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
        {authors.map((author: any, i: number) => (
          <AuthorCard key={author._id} author={author} index={i} />
        ))}
      </div>

      {/* Signup form (optional, bottom) */}
      <div className="mt-16">
        <AuthorSignupForm />
      </div>
    </section>
  );
}
