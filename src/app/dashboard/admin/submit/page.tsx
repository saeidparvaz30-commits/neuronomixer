import { client } from "@/sanity/lib/client";
import SubmitPostForm from "@/app/dashboard/author/submit/SubmitPostForm";

interface Category {
  _id: string;
  title: string;
}

async function getCategories(): Promise<Category[]> {
  return client.fetch(`*[_type == "category"] | order(title asc) { _id, title }`);
}

export default async function AdminSubmitPostPage() {
  const categories = await getCategories();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Submit a Post</h1>
      <p className="text-sm text-gray-500 mb-6">
        Posts are reviewed by an admin before being published.
      </p>
      <SubmitPostForm categories={categories} redirectTo="/dashboard/admin/my-posts" />
    </div>
  );
}
