import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { createMailTransport } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sanityAuthorId, userId } = await req.json();

  if (!sanityAuthorId) {
    return NextResponse.json({ error: "sanityAuthorId required" }, { status: 400 });
  }

  // Approve in Sanity
  await client
    .patch(sanityAuthorId)
    .set({ applicationStatus: "approved" })
    .commit();

  // Upgrade role in Prisma
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: "AUTHOR",
        authorStatus: "APPROVED",
        sanityAuthorId,
      },
    });

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId,
        type: "author_approved",
        message: "Your author application has been approved! You can now submit posts.",
        link: "/dashboard/author",
      },
    }).catch(() => {});

    // Send email notification (fire-and-forget)
    notifyAuthorApproved(userId).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

async function notifyAuthorApproved(userId: string) {
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
    subject: "Your author application has been approved!",
    text: `Hi ${user.name ?? "there"},\n\nCongratulations! Your application to become an author on NeuroNomixer has been approved.\n\nYou can now log in and start submitting articles.\n\nVisit your dashboard: ${siteUrl}/dashboard/author\n\n— NeuroNomixer`,
    html: `
      <p>Hi ${user.name ?? "there"},</p>
      <p>Congratulations! 🎉 Your application to become an author on NeuroNomixer has been <strong>approved</strong>.</p>
      <p>You can now log in and start submitting articles for review.</p>
      <p style="margin:24px 0">
        <a href="${siteUrl}/dashboard/author" style="background:#1e5d8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Go to Author Dashboard
        </a>
      </p>
      <p style="color:#888;font-size:0.85em">— NeuroNomixer Team</p>
    `,
  });
}
