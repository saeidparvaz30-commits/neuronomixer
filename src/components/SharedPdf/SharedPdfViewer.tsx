"use client";

import dynamic from "next/dynamic";

const PdfCanvas = dynamic(() => import("./PdfCanvas"), {
  ssr: false,
  loading: () => <p className="text-sm text-gray-400 py-12 text-center">Loading viewer...</p>,
});

export default function SharedPdfViewer({
  fileUrl,
  downloadUrl,
  title,
}: {
  fileUrl: string;
  downloadUrl: string;
  title: string;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <a
          href={downloadUrl}
          className="shrink-0 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black hover:opacity-90 transition-opacity"
        >
          Download PDF
        </a>
      </div>
      <PdfCanvas fileUrl={fileUrl} />
    </div>
  );
}
