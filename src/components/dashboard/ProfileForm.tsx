"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Loader2, Check } from "lucide-react";

interface Props {
  name: string;
  email: string;
  image: string | null;
  // Sanity author fields
  shortBio?: string;
  longBio?: string;
  jobTitle?: string;
  employer?: string;
  education?: string;
  linkedIn?: string;
  github?: string;
  twitter?: string;
  personalWebsite?: string;
  contactEmail?: string;
}

export default function ProfileForm({
  name: initialName,
  email,
  image: initialImage,
  shortBio: initialShortBio = "",
  longBio: initialLongBio = "",
  jobTitle: initialJobTitle = "",
  employer: initialEmployer = "",
  education: initialEducation = "",
  linkedIn: initialLinkedIn = "",
  github: initialGithub = "",
  twitter: initialTwitter = "",
  personalWebsite: initialPersonalWebsite = "",
  contactEmail: initialContactEmail = "",
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [shortBio, setShortBio] = useState(initialShortBio);
  const [longBio, setLongBio] = useState(initialLongBio);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [employer, setEmployer] = useState(initialEmployer);
  const [education, setEducation] = useState(initialEducation);
  const [linkedIn, setLinkedIn] = useState(initialLinkedIn);
  const [github, setGithub] = useState(initialGithub);
  const [twitter, setTwitter] = useState(initialTwitter);
  const [personalWebsite, setPersonalWebsite] = useState(initialPersonalWebsite);
  const [contactEmail, setContactEmail] = useState(initialContactEmail);

  const [imageUrl, setImageUrl] = useState(initialImage ?? "");
  const [imageAssetId, setImageAssetId] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/dashboard/author/upload-asset", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setImageUrl(data.url);
      if (data._id) setImageAssetId(data._id);
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaveLoading(true);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          shortBio,
          longBio,
          jobTitle,
          employer,
          education,
          linkedIn,
          github,
          twitter,
          personalWebsite,
          contactEmail,
          imageUrl: imageUrl || undefined,
          imageAssetId: imageAssetId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaveLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50";
  const labelCls = "block text-sm text-gray-300 mb-1.5";

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Left column ─────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 shrink-0">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={name}
                  fill
                  className="object-cover rounded-full"
                  unoptimized
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-gray-400">
                  {name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadLoading}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {uploadLoading
                  ? <Loader2 size={12} className="animate-spin text-black" />
                  : <Camera size={12} className="text-black" />
                }
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Profile photo</p>
              <p className="text-xs text-gray-500 mt-0.5">PNG, JPG, GIF, WebP — max 10 MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </div>

          {/* Name */}
          <div>
            <label className={labelCls}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-500 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-gray-600 mt-1">Email cannot be changed here.</p>
          </div>

          {/* Short Bio */}
          <div>
            <label className={labelCls}>Short Bio</label>
            <textarea
              value={shortBio}
              onChange={(e) => setShortBio(e.target.value)}
              rows={3}
              placeholder="One or two sentences shown on your author card..."
              className={`${inputCls} resize-none`}
            />
            <p className="text-xs text-gray-600 mt-1">Displayed in italics on your public author card.</p>
          </div>

          {/* Long Bio */}
          <div>
            <label className={labelCls}>Full Bio</label>
            <textarea
              value={longBio}
              onChange={(e) => setLongBio(e.target.value)}
              rows={5}
              placeholder="A fuller description shown on your author profile page..."
              className={`${inputCls} resize-none`}
            />
            <p className="text-xs text-gray-600 mt-1">Shown as a paragraph on your public author card and profile.</p>
          </div>

          {/* Professional */}
          <div>
            <label className={labelCls}>Job Title</label>
            <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Employer / Company</label>
            <input type="text" value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="e.g. Acme Corp" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Education</label>
            <input type="text" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. MSc Computer Science, MIT" className={inputCls} />
          </div>
        </div>

        {/* ── Right column — Social & Contact ─────────────────────────── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white mb-4">Social & Contact Links</h2>
            <p className="text-xs text-gray-500 mb-6">These appear as icons on your public author profile and author card.</p>
          </div>

          {/* LinkedIn */}
          <div>
            <label className={labelCls}>LinkedIn</label>
            <input
              type="url"
              value={linkedIn}
              onChange={(e) => setLinkedIn(e.target.value)}
              placeholder="https://linkedin.com/in/yourname"
              className={inputCls}
            />
          </div>

          {/* GitHub */}
          <div>
            <label className={labelCls}>GitHub</label>
            <input
              type="url"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="https://github.com/yourname"
              className={inputCls}
            />
          </div>

          {/* Twitter / X */}
          <div>
            <label className={labelCls}>Twitter / X</label>
            <input
              type="url"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="https://twitter.com/yourname"
              className={inputCls}
            />
          </div>

          {/* Personal Website */}
          <div>
            <label className={labelCls}>Personal Website</label>
            <input
              type="url"
              value={personalWebsite}
              onChange={(e) => setPersonalWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              className={inputCls}
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className={labelCls}>Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="public contact email"
              className={inputCls}
            />
            <p className="text-xs text-gray-600 mt-1">This is your public contact email, separate from your login email.</p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mt-6">{error}</p>}

      <div className="mt-8">
        <button
          type="submit"
          disabled={saveLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-accent)] text-black text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saveLoading
            ? <Loader2 size={15} className="animate-spin" />
            : saved
            ? <Check size={15} />
            : null
          }
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
