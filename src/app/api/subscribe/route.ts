import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, token } = await req.json();

    // ---- reCAPTCHA verification ----
    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
    const formData = new URLSearchParams();
    formData.append("secret", process.env.RECAPTCHA_SECRET_KEY || "");
    formData.append("response", token || "");

    const recaptchaRes = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    let recaptchaData: { success: boolean; [key: string]: unknown } = { success: false };
    try {
      recaptchaData = JSON.parse(await recaptchaRes.text());
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid reCAPTCHA response." },
        { status: 502 }
      );
    }

    if (!recaptchaData.success) {
      return NextResponse.json(
        { success: false, message: "Captcha verification failed." },
        { status: 403 }
      );
    }

    // ---- Brevo ----
    const apiKey = process.env.BREVO_API_KEY!;
    const listId = process.env.BREVO_LIST_ID!;

    const brevoRes = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({ email, listIds: [Number(listId)], updateEnabled: true }),
    });

    if (!brevoRes.ok) {
      console.error("[subscribe] Brevo add failed, status", brevoRes.status);
      return NextResponse.json(
        { success: false, message: "Could not complete subscription. Please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, message: "Subscribed successfully!" });
  } catch (err) {
    console.error("[subscribe] unexpected error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { success: false, message: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
