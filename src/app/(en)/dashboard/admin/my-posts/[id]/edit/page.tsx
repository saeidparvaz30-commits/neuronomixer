import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { portableTextToTiptap } from "@/lib/portableTextToTiptap";
import EditPostFormLoader from "@/app/(en)/dashboard/author/posts/[id]/edit/EditPostFormLoader";

interface Category {
  _id: string;
  title: string;
}

interface SanityPost {
  _id: string;
  title: string;
  status: string;
  submittedBy: string;
  description?: string;
  metaDescription?: string;
  category?: { _id: string };
  mainImage?: { asset?: { _id: string; url: string } };
  body?: unknown[];
}

async function getPost(postId: string): Promise<SanityPost | null> {
  return client.fetch(
    `*[_type == "post" && _id == $postId][0]{
      _id, title, status, submittedBy, description, metaDescription,
      category->{ _id },
      mainImage{ asset->{ _id, url } },
      body[]{
        ...,
        _type == "image" => { ..., asset->{ _id, url } }
      }
    }`,
    { postId }
  );
}

async function getCategories(): Promise<Category[]> {
  return client.fetch(`*[_type == "category"] | order(title asc) { _id, title }`);
}

export default async function AdminEditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");

  const role = session.user.role;
  if (role !== "ADMIN") redirect("/dashboard/admin");

  const [post, categories] = await Promise.all([getPost(id), getCategories()]);

  if (!post) notFound();

  const tiptapJson =
    Array.isArray(post.body) && post.body.length > 0
      ? portableTextToTiptap(post.body as Parameters<typeof portableTextToTiptap>[0])
      : undefined;

  const initialData = {
    postId: post._id,
    title: post.title ?? "",
    categoryId: post.category?._id ?? "",
    excerpt: post.description ?? "",
    metaDescription: post.metaDescription ?? "",
    tiptapJson,
    coverImageUrl: post.mainImage?.asset?.url ?? null,
    coverImageAssetId: post.mainImage?.asset?._id ?? null,
    currentStatus: post.status,
  };

  const statusLabels: Record<string, string> = {
    draft: "Editing Draft",
    pending: "Editing Pending Post",
    rejected: "Editing Rejected Post",
    approved: "Editing Published Post",
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">
        {statusLabels[post.status] ?? "Edit Post"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {post.status === "approved"
          ? "This post is currently live. Saving changes will send it back for review."
          : post.status === "pending"
          ? "This post is under review. You can update it — the latest version will be shown."
          : post.status === "rejected"
          ? "Update your post and resubmit for review."
          : "Continue editing your draft."}
      </p>

      <EditPostFormLoader
        categories={categories}
        initialData={initialData}
        redirectTo="/dashboard/admin/my-posts"
      />
    </div>
  );
}
