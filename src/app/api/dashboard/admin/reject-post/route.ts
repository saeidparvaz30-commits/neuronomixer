import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";
import { prisma } from "@/lib/prisma";
import { createMailTransport } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId } = await req.json();
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  // Fetch post details before patching
  const post = await client.fetch(
    `*[_id == $postId][0]{
      title,
      "authorUserId": author->userId,
      "authorName": author->name
    }`,
    { postId }
  );

  await client
    .patch(postId)
    .set({ status: "rejected" })
    .commit();

  // Notify the author (in-app + email)
  if (post?.authorUserId) {
    await prisma.notification.create({
      data: {
        userId: post.authorUserId,
        type: "post_rejected",
        message: `Your post "${post.title}" was not approved. You can edit and resubmit it from your dashboard.`,
        link: "/dashboard/author/posts",
      },
    }).catch(() => {});

    notifyAuthorPostRejected(post.authorUserId, post.title).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

async function notifyAuthorPostRejected(userId: string, postTitle: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com";
  const transporter = createMailTransport();

  await transporter.sendMail({
    from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Update on your post "${postTitle}"`,
    text: `Hi ${user.name ?? "there"},\n\nYour post "${postTitle}" was reviewed but was not approved at this time.\n\nYou can edit and resubmit it from your author dashboard: ${siteUrl}/dashboard/author/posts\n\nIf you have questions, feel free to contact us: ${siteUrl}/contact\n\n— NeuroNomixer`,
    html: `
      <p>Hi ${user.name ?? "there"},</p>
      <p>Your post <strong>"${postTitle}"</strong> was reviewed but was not approved at this time.</p>
      <p>You can edit your post and resubmit it for review from your author dashboard.</p>
      <p style="margin:24px 0">
        <a href="${siteUrl}/dashboard/author/posts" style="background:#1e5d8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          View My Posts
        </a>
      </p>
      <p>If you have any questions, <a href="${siteUrl}/contact">contact us</a>.</p>
      <p style="color:#888;font-size:0.85em">— NeuroNomixer Team</p>
    `,
  });
}
