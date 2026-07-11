import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveShare } from "@/lib/sharedPdfs";
import SharedPdfViewer from "@/components/SharedPdf/SharedPdfViewer";

export const dynamic = "force-dynamic";

const getShare = cache(getActiveShare);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const share = await getShare(token);
  return {
    title: share ? share.title : "Not found",
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await getShare(token);
  if (!share) notFound();

  // Count the view after the response is sent; failures never break the page.
  after(() => {
    void prisma.sharedPdfEvent
      .create({ data: { sharedPdfId: share.id, type: "VIEW" } })
      .catch((e) => console.error("sharedPdf event", e));
  });

  return (
    <SharedPdfViewer
      title={share.title}
      fileUrl={`/api/share/${token}/file`}
      downloadUrl={`/api/share/${token}/download`}
    />
  );
}
