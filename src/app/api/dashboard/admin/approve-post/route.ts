import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createMailTransport } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId, scheduledAt } = await req.json();
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  // Fetch post details before patching
  const post = await client.fetch(
    `*[_id == $postId][0]{
      title,
      "slug": slug.current,
      "authorRef": author._ref,
      "categoryRef": category._ref,
      "categorySlug": category->slug.current,
      "authorName": author->name,
      "authorUserId": author->userId
    }`,
    { postId }
  );

  // If a future scheduledAt is provided, mark as scheduled rather than live
  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const isScheduled = scheduleDate && scheduleDate > new Date();

  if (isScheduled) {
    await client
      .patch(postId)
      .set({ status: "scheduled", publishedAt: scheduleDate.toISOString() })
      .commit();

    // Notify author that post is approved and scheduled
    if (post?.authorUserId) {
      await prisma.notification.create({
        data: {
          userId: post.authorUserId,
          type: "post_approved",
          message: `Your post "${post.title}" has been approved and is scheduled to publish on ${scheduleDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, scheduled: true });
  }

  // Publish immediately
  await client
    .patch(postId)
    .set({ status: "approved", publishedAt: new Date().toISOString() })
    .commit();

  // Purge ISR cache so the post page renders live immediately
  if (post?.categorySlug && post?.slug) {
    revalidatePath(`/blog/${post.categorySlug}/${post.slug}`);
  }
  revalidatePath("/");
  revalidatePath("/blog");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const postUrl = `${siteUrl}/blog/${post?.categorySlug ?? ""}/${post?.slug ?? ""}`;

  // Notify the author (in-app + email)
  if (post?.authorUserId) {
    await prisma.notification.create({
      data: {
        userId: post.authorUserId,
        type: "post_approved",
        message: `Your post "${post.title}" has been approved and is now live!`,
        link: postUrl,
      },
    }).catch(() => {});

    notifyAuthorPostApproved(post.authorUserId, post.title, postUrl).catch(() => {});
  }

  // Notify all members with emailNotifications enabled (in-app + email, fire-and-forget)
  notifyAllUsers(post, postUrl, siteUrl).catch((err) =>
    console.error("[approve-post] notification error:", err)
  );

  return NextResponse.json({ success: true, scheduled: false });
}

async function notifyAuthorPostApproved(userId: string, postTitle: string, postUrl: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  await createMailTransport().sendMail({
    from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Your post "${postTitle}" is now live!`,
    text: `Hi ${user.name ?? "there"},\n\nGreat news! Your post "${postTitle}" has been approved and is now live on NeuroNomixer.\n\nRead it here: ${postUrl}\n\n— NeuroNomixer`,
    html: `
      <p>Hi ${user.name ?? "there"},</p>
      <p>Great news! Your post <strong>"${postTitle}"</strong> has been approved and is now live on NeuroNomixer.</p>
      <p style="margin:24px 0">
        <a href="${postUrl}" style="background:#1e5d8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          View Your Post
        </a>
      </p>
      <p style="color:#888;font-size:0.85em">— NeuroNomixer Team</p>
    `,
  });
}

async function notifyAllUsers(
  post: { title: string; authorName?: string },
  postUrl: string,
  siteUrl: string
) {
  const users = await prisma.user.findMany({
    where: {
      emailNotifications: true,
      email: { not: null },
      emailVerified: { not: null },
    },
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) return;

  // In-app notifications for all opted-in members
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: "new_post",
      message: `New post: "${post.title}"`,
      link: postUrl,
    })),
    skipDuplicates: true,
  });

  // Email notifications
  const transporter = createMailTransport();
  for (const user of users) {
    if (!user.email) continue;
    const name = user.name ?? "Reader";
    await transporter.sendMail({
      from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `New post: ${post.title}`,
      text: `Hi ${name},\n\n${post.authorName ?? "An author"} just published "${post.title}".\n\nRead it here: ${postUrl}\n\n— NeuroNomixer`,
      html: `
        <p>Hi ${name},</p>
        <p><strong>${post.authorName ?? "An author"}</strong> just published a new article:</p>
        <p><a href="${postUrl}" style="font-size:1.1em;font-weight:bold;">${post.title}</a></p>
        <p style="margin:16px 0"><a href="${postUrl}" style="background:#1e5d8a;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Read the article →</a></p>
        <hr/>
        <p style="font-size:0.8em;color:#888;">You're receiving this as a NeuroNomixer member. <a href="${siteUrl}/dashboard/subscriber">Manage notifications</a>.</p>
      `,
    }).catch(() => {});
  }
}
