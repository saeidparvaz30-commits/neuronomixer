import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  const { name, email, message } = await request.json();

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 }
    );
  }

  try {
    // 1️⃣ Add / update contact in your Brevo Authors list
    await fetch("https://api.brevo.com/v3/contacts", {
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
    }).catch((err) => console.warn("Brevo add failed:", err));

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
      to: process.env.CONTACT_RECIPIENT, // your Namecheap inbox
      subject: `✍️ New Author Application from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Message:</strong></p>
        <p>${(message || "").replace(/\n/g, "<br/>")}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Author join error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request." },
      { status: 500 }
    );
  }
}
