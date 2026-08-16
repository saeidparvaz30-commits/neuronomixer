import { client } from "@/sanity/lib/client";
import CategoryRow from "./CategoryRow";
import NewCategoryForm from "./NewCategoryForm";

interface Category {
  _id: string;
  title: string;
  description?: string;
  active: boolean;
  postCount: number;
}

async function getCategories(): Promise<Category[]> {
  const cats = await client.fetch<{ _id: string; title: string; description?: string; active?: boolean }[]>(
    `*[_type == "category"] | order(order asc, title asc) { _id, title, description, active }`
  );
  const withCounts = await Promise.all(
    cats.map(async (c) => {
      const count = await client.fetch<number>(
        `count(*[_type == "post" && references($id)])`,
        { id: c._id }
      );
      return { ...c, active: c.active ?? true, postCount: count };
    })
  );
  return withCounts;
}

export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Categories</h1>
        <NewCategoryForm />
      </div>

      {categories.length === 0 ? (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-8 text-center text-gray-500">
          No categories yet. Create one above.
        </div>
      ) : (
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Posts</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {categories.map((cat) => (
                <CategoryRow
                  key={cat._id}
                  categoryId={cat._id}
                  title={cat.title}
                  description={cat.description}
                  active={cat.active}
                  postCount={cat.postCount}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
