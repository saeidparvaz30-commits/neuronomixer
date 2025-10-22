import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const apiKey = process.env.BREVO_API_KEY!;
    const listId = process.env.BREVO_LIST_ID!;

    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [Number(listId)],
        updateEnabled: true, // updates if already exists
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Brevo error:", data);
      return NextResponse.json(
        { success: false, message: data.message || "Subscription failed." },
        { status: res.status }
      );
    }

    console.log("✅ New Brevo subscriber:", email);

    return NextResponse.json({
      success: true,
      message: "Subscribed successfully!",
    });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { success: false, message: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
