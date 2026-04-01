import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { client } from "@/sanity/lib/client";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const user = await authenticateApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401, headers: CORS });
  }

  const categories = await client.fetch(
    `*[_type == "category"] | order(order asc) {
      title,
      "slug": slug.current,
      description
    }`
  );

  return NextResponse.json({ categories }, { headers: CORS });
}
