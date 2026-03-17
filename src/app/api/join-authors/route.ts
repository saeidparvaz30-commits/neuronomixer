import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  const { name, email, message } = await request.json();

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 }
    );
  }

  const safeName = escapeHtml(String(name));
  const safeEmail = escapeHtml(String(email));
  const safeMessage = escapeHtml(String(message || "")).replace(/\n/g, "<br/>");

  try {
    // 1️⃣ Add / update contact in your Brevo Authors list
    const brevoRes = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: name, MESSAGE: message || "" },
        listIds: [Number(process.env.BREVO_LIST_ID_AUTHORS) || 6],
        updateEnabled: true,
      }),
    });

    if (!brevoRes.ok) {
      const brevoErr = await brevoRes.text().catch(() => "unknown");
      console.warn("Brevo add failed:", brevoRes.status, brevoErr);
    }

    // 2️⃣ Send notification email to your Namecheap inbox via SMTP (same as contact form)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"NeuroNomixer Authors" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_RECIPIENT,
      subject: `New Author Application from ${safeName}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Author join error:", error);
    const msg = error instanceof Error ? error.message : "Failed to process request.";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
