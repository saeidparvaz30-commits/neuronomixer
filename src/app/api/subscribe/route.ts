import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("📥 /api/subscribe called");

  try {
    const { email, token } = await req.json();
    console.log("📧 Received:", email);
    console.log("🔑 Token:", token ? "present" : "missing");

    // ---- reCAPTCHA Verification ----
    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
    const formData = new URLSearchParams();
    formData.append("secret", process.env.RECAPTCHA_SECRET_KEY || "");
    formData.append("response", token || "");

    const recaptchaRes = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    console.log("🌍 reCAPTCHA status:", recaptchaRes.status);

    const text = await recaptchaRes.text();
    console.log("🧩 reCAPTCHA response text:", text);

    let recaptchaData: { success: boolean; [key: string]: unknown } = { success: false };
    try {
      recaptchaData = JSON.parse(text);
    } catch (err) {
      console.error("❌ JSON parse error:", err);
      return NextResponse.json(
        { success: false, message: "Invalid reCAPTCHA response." },
        { status: 502 }
      );
    }

    if (!recaptchaData.success) {
      console.error("❌ reCAPTCHA failed:", recaptchaData);
      return NextResponse.json(
        { success: false, message: "Captcha verification failed." },
        { status: 403 }
      );
    }

    console.log("✅ reCAPTCHA verified successfully.");

    // ---- Brevo Section ----
    const apiKey = process.env.BREVO_API_KEY!;
    const listId = process.env.BREVO_LIST_ID!;
    console.log("📦 Sending to Brevo...");

    const brevoRes = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [Number(listId)],
        updateEnabled: true,
      }),
    });

    const brevoText = await brevoRes.text();
    console.log("📬 Brevo response text:", brevoText);

    if (!brevoRes.ok) {
      return NextResponse.json(
        { success: false, message: "Brevo error: " + brevoText },
        { status: brevoRes.status }
      );
    }

    console.log("✅ Subscription success!");
    return NextResponse.json({
      success: true,
      message: "Subscribed successfully!",
    });
  } catch (err) {
    console.error("❌ Unexpected server error:", err);
    return NextResponse.json(
      { success: false, message: "Server error. " + err },
      { status: 500 }
    );
  }
}
