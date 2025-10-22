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

export const revalidate = 60; // ISR (optional)

export default async function AuthorsPage() {
  const authors = await client.fetch(query);

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <h1 className="text-5xl font-bold mb-12 text-center text-gray-300">
        NeuroNomixer Authors & Contributors
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {authors.map((author: any, i: number) => (
          <AuthorCard key={author._id} author={author} index={i} />
        ))}
      </div>
      <AuthorSignupForm />
    </section>
  );
}
