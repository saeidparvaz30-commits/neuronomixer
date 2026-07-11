"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type ShareRow = {
  id: string;
  token: string;
  title: string;
  sizeBytes: number;
  active: boolean;
  createdAt: string;
  views: number;
  downloads: number;
};

const fmtSize = (b: number) =>
  b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

export default function SharedPdfsClient() {
  const [shares, setShares] = useState<ShareRow[] | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/admin/shared-pdfs");
    if (res.ok) setShares((await res.json()).shares);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) {
      setError("Pick a PDF and give it a title.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await upload(`shared-pdfs/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/dashboard/admin/shared-pdfs/upload-token",
      });
      const res = await fetch("/api/dashboard/admin/shared-pdfs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          url: blob.url,
          pathname: blob.pathname,
          size: file.size,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to register share");
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (row: ShareRow) => {
    await navigator.clipboard.writeText(`https://www.neuronomixer.com/share/${row.token}`);
    setCopiedId(row.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleActive = async (row: ShareRow) => {
    const res = await fetch(`/api/dashboard/admin/shared-pdfs/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active }),
    });
    if (res.ok) await load();
  };

  const remove = async (row: ShareRow) => {
    if (!window.confirm(`Delete "${row.title}"? The file and its stats are removed permanently.`)) return;
    const res = await fetch(`/api/dashboard/admin/shared-pdfs/${row.id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  return (
    <div className="px-6 py-8 max-w-5xl">
      <h1 className="text-xl font-semibold text-white mb-6">Shared PDFs</h1>

      <form
        onSubmit={handleUploadSubmit}
        className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
      >
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-64 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Norway student visa checklist"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          PDF file (max 50 MB)
          <input ref={fileRef} type="file" accept="application/pdf" className="text-sm text-gray-400" />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {busy ? "Uploading..." : "Upload and create link"}
        </button>
        {error && <p className="w-full text-sm text-red-400">{error}</p>}
      </form>

      {shares === null ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : shares.length === 0 ? (
        <p className="text-sm text-gray-400">No shared PDFs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/10">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Views</th>
                <th className="py-2 pr-4">Downloads</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shares.map((row) => (
                <tr key={row.id} className="border-b border-white/5 text-gray-300">
                  <td className="py-2.5 pr-4 text-white">{row.title}</td>
                  <td className="py-2.5 pr-4">{fmtSize(row.sizeBytes)}</td>
                  <td className="py-2.5 pr-4">{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td className="py-2.5 pr-4">{row.views}</td>
                  <td className="py-2.5 pr-4">{row.downloads}</td>
                  <td className="py-2.5 pr-4">
                    <span className={row.active ? "text-emerald-400" : "text-gray-500"}>
                      {row.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-2.5 flex gap-2">
                    <button onClick={() => void copyLink(row)} className="rounded-md border border-white/10 px-2.5 py-1 text-xs hover:bg-white/10">
                      {copiedId === row.id ? "Copied!" : "Copy link"}
                    </button>
                    <button onClick={() => void toggleActive(row)} className="rounded-md border border-white/10 px-2.5 py-1 text-xs hover:bg-white/10">
                      {row.active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => void remove(row)} className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
