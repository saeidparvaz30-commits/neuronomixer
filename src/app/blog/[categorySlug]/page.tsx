import { client } from "@/sanity/lib/client";
import CategoryViewClient from "@/components/Category/CategoryViewClient";
import { notFound } from "next/navigation";

const query = `
*[_type=="category" && slug.current == $slug][0]{
  _id,
  title,
  slug,
  description,
  intuitive,
  image{ asset->{ url } },
  "posts": *[_type=="post" && references(^._id)] | order(order asc){
    _id, title, slug, description
  }, 
  active
}`;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug: slug } = await params;
  if (!slug) notFound();

  const category = await client.fetch(query, { slug });

  // 404 if not found OR inactive
  if (!category || category.active === false) {
    notFound();
  }

  return <CategoryViewClient category={category} />;
}
