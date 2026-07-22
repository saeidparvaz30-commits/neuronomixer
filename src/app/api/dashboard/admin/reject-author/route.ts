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

  await client
    .patch(sanityAuthorId)
    .set({ applicationStatus: "rejected" })
    .commit();

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { authorStatus: "REJECTED" },
    });

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId,
        type: "author_rejected",
        message: "Your author application was not approved at this time. You can re-apply in the future.",
        link: "/dashboard/subscriber",
      },
    }).catch(() => {});

    // Send email notification (fire-and-forget)
    notifyAuthorRejected(userId).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

async function notifyAuthorRejected(userId: string) {
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
    subject: "Update on your NeuroNomixer author application",
    text: `Hi ${user.name ?? "there"},\n\nThank you for your interest in writing for NeuroNomixer. Unfortunately, your application was not approved at this time.\n\nYou're welcome to re-apply in the future. In the meantime, you can still enjoy reading and following your favourite authors and categories.\n\nIf you have any questions, feel free to reach out: ${siteUrl}/contact\n\n— NeuroNomixer`,
    html: `
      <p>Hi ${user.name ?? "there"},</p>
      <p>Thank you for your interest in writing for NeuroNomixer.</p>
      <p>Unfortunately, your author application was not approved at this time. You're welcome to re-apply in the future.</p>
      <p>In the meantime, you can still enjoy reading and following your favourite authors and categories on the platform.</p>
      <p>If you have questions, <a href="${siteUrl}/contact">contact us</a>.</p>
      <p style="color:#888;font-size:0.85em">— NeuroNomixer Team</p>
    `,
  });
}
