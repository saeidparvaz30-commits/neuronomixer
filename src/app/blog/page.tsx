import { client } from "@/sanity/lib/client";
import AnimatedCategories from "@/components/Category/AnimatedCategories";

const query = `
*[_type == "category" && active == true] | order(order asc) {
  _id,
  title,
  slug,
  description,
  intuitive,
  image {
    asset->{ url }
  },
  active
}`;

export default async function BlogPage() {
  // ✅ fetch all categories
  const categories = await client.fetch(query);

  if (!categories || categories.length === 0) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-center text-[var(--color-text-muted)]">
          No categories found. Add some in Sanity Studio!
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <AnimatedCategories categories={categories} />
    </main>
  );
}
