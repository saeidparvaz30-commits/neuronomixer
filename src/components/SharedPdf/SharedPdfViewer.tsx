"use client";

import dynamic from "next/dynamic";

const PdfCanvas = dynamic(() => import("./PdfCanvas"), {
  ssr: false,
  loading: () => <p className="text-sm text-gray-400 py-12 text-center">Loading viewer...</p>,
});

export default function SharedPdfViewer({
  fileUrl,
  title,
}: {
  fileUrl: string;
  title: string;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      <h1 className="text-xl font-semibold text-white mb-6">{title}</h1>
      <PdfCanvas fileUrl={fileUrl} />
    </div>
  );
}
