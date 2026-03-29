"use client";

import { useState, useRef } from "react";
import { X, PenLine, Upload, Loader2, CheckCircle } from "lucide-react";
import Image from "next/image";

interface Props {
  initialStatus?: string | null;
}

export default function AuthorApplicationModal({ initialStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(initialStatus === "PENDING");

  const [education, setEducation] = useState("");
  const [jobTitle, setJobTitle]   = useState("");
  const [employer, setEmployer]   = useState("");
  const [shortBio, setShortBio]   = useState("");
  const [longBio, setLongBio]     = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!shortBio.trim() || !longBio.trim()) {
      setError("Short bio and long bio are required.");
      return;
    }
    setLoading(true);
    setError("");

    const fd = new FormData();
    fd.append("education", education);
    fd.append("jobTitle",  jobTitle);
    fd.append("employer",  employer);
    fd.append("shortBio",  shortBio);
    fd.append("longBio",   longBio);
    if (imageFile) fd.append("image", imageFile);

    try {
      const res = await fetch("/api/dashboard/subscriber/apply-author", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  // Already applied — show status badge
  if (submitted) {
    return (
      <div className="flex items-center justify-between bg-[#060d18]/80 border border-[var(--color-accent)]/20 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3">
          <CheckCircle size={16} className="text-[var(--color-accent)] shrink-0" />
          <p className="text-sm text-gray-400">Author application submitted — pending admin review.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* CTA Banner */}
      <div className="flex items-center justify-between bg-[#060d18]/80 border border-[var(--color-accent)]/20 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3">
          <PenLine size={16} className="text-[var(--color-accent)] shrink-0" />
          <p className="text-sm text-gray-400">Want to write articles on NeuroNomixer?</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/25 transition-colors whitespace-nowrap ml-4"
        >
          Apply as Author
        </button>
      </div>

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f172a]">
              <h2 className="text-lg font-semibold text-white">Apply to become an Author</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submit} className="px-6 py-6 flex flex-col gap-5">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={72}
                      height={72}
                      className="rounded-full object-cover w-[72px] h-[72px] shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-[72px] h-[72px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Upload size={22} className="text-gray-500" />
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-sm px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      {imagePreview ? "Change photo" : "Upload photo"}
                    </button>
                    <p className="text-xs text-gray-600 mt-1">JPG, PNG or WebP. Max 5MB.</p>
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onImageChange}
                />
              </div>

              {/* Row: Job Title + Employer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Data Scientist"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Employer / Organisation
                  </label>
                  <input
                    type="text"
                    value={employer}
                    onChange={(e) => setEmployer(e.target.value)}
                    placeholder="e.g. Google DeepMind"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]/50"
                  />
                </div>
              </div>

              {/* Education */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Education
                </label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g. MSc Machine Learning, UCL"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]/50"
                />
              </div>

              {/* Short Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Short Bio <span className="text-red-400">*</span>
                  <span className="ml-2 text-xs font-normal text-gray-600">Appears under your posts (1–2 sentences)</span>
                </label>
                <textarea
                  value={shortBio}
                  onChange={(e) => setShortBio(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="A brief introduction to appear under your blog posts..."
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]/50"
                />
                <p className="text-xs text-gray-600 mt-1 text-right">{shortBio.length}/300</p>
              </div>

              {/* Long Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Full Bio <span className="text-red-400">*</span>
                  <span className="ml-2 text-xs font-normal text-gray-600">Displayed on your author profile page</span>
                </label>
                <textarea
                  value={longBio}
                  onChange={(e) => setLongBio(e.target.value)}
                  rows={6}
                  maxLength={3000}
                  placeholder="Tell readers about yourself — your background, expertise, what topics you write about, and why you want to contribute to NeuroNomixer..."
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]/50"
                />
                <p className="text-xs text-gray-600 mt-1 text-right">{longBio.length}/3000</p>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <p className="text-xs text-gray-600">
                  Your application will be reviewed by our admin team.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--color-accent)] text-[#0f172a] font-semibold text-sm hover:bg-[var(--color-accent)]/80 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
