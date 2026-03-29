"use client";

import { useRef, useState } from "react";
import {
  Upload, Save, Plus, X, ExternalLink, Loader2, CheckCircle,
  AlertCircle, Globe, Linkedin, Github, Twitter, GraduationCap,
  Briefcase, Sparkles, User, BookOpen, Users, Eye, EyeOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EducationEntry {
  school: string; degree: string; field: string; from: string; to: string; description: string;
}
interface ExperienceEntry {
  company: string; title: string; from: string; to: string; current: boolean; description: string;
}
interface SkillEntry { name: string; level: string; }
interface ReferenceEntry { name: string; role: string; company: string; email: string; }

interface CVData {
  name: string; tagline: string; bio: string; location: string;
  email: string; phone: string; website: string;
  linkedin: string; github: string; twitter: string; avatarUrl: string;
  education: EducationEntry[]; experience: ExperienceEntry[];
  skills: SkillEntry[]; references: ReferenceEntry[];
  isPublic: boolean; slug: string;
}

const empty: CVData = {
  name: "", tagline: "", bio: "", location: "", email: "", phone: "",
  website: "", linkedin: "", github: "", twitter: "", avatarUrl: "",
  education: [], experience: [], skills: [], references: [],
  isPublic: false, slug: "",
};

function emptyEducation(): EducationEntry {
  return { school: "", degree: "", field: "", from: "", to: "", description: "" };
}
function emptyExperience(): ExperienceEntry {
  return { company: "", title: "", from: "", to: "", current: false, description: "" };
}
function emptySkill(): SkillEntry { return { name: "", level: "" }; }
function emptyReference(): ReferenceEntry { return { name: "", role: "", company: "", email: "" }; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className="text-[var(--color-accent)] shrink-0" />
      <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-accent)]">
        {label}
      </h2>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", multiline = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; multiline?: boolean;
}) {
  const base =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors";
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${base} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={base}
        />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CVBuilderClient({ initialCV }: { initialCV: CVData | null }) {
  const [cv, setCv] = useState<CVData>(() =>
    initialCV
      ? {
          ...empty,
          ...initialCV,
          education: (initialCV.education as EducationEntry[]) ?? [],
          experience: (initialCV.experience as ExperienceEntry[]) ?? [],
          skills: (initialCV.skills as SkillEntry[]) ?? [],
          references: (initialCV.references as ReferenceEntry[]) ?? [],
          isPublic: initialCV.isPublic ?? false,
          slug: initialCV.slug ?? "",
        }
      : empty
  );

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof CVData>(key: K, val: CVData[K]) {
    setCv((prev) => ({ ...prev, [key]: val }));
  }

  // ── File extract ────────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setUploadError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/cv/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? "Extraction failed."); return; }
      // Merge AI draft into current form state (don't overwrite user edits with empty strings)
      const draft = data.cv as Partial<CVData>;
      setCv((prev) => ({
        ...prev,
        name: draft.name || prev.name,
        tagline: draft.tagline || prev.tagline,
        bio: draft.bio || prev.bio,
        location: draft.location || prev.location,
        email: draft.email || prev.email,
        phone: draft.phone || prev.phone,
        website: draft.website || prev.website,
        linkedin: draft.linkedin || prev.linkedin,
        github: draft.github || prev.github,
        twitter: draft.twitter || prev.twitter,
        education: (draft.education as EducationEntry[])?.length ? draft.education as EducationEntry[] : prev.education,
        experience: (draft.experience as ExperienceEntry[])?.length ? draft.experience as ExperienceEntry[] : prev.experience,
        skills: (draft.skills as SkillEntry[])?.length ? draft.skills as SkillEntry[] : prev.skills,
        references: (draft.references as ReferenceEntry[])?.length ? draft.references as ReferenceEntry[] : prev.references,
      }));
    } catch {
      setUploadError("Network error. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaveError("");
    setSaveSuccess(false);
    setSaving(true);
    try {
      const res = await fetch("/api/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cv),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Save failed."); return; }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── List helpers ─────────────────────────────────────────────────────────────

  function addEdu() { set("education", [...cv.education, emptyEducation()]); }
  function removeEdu(i: number) { set("education", cv.education.filter((_, j) => j !== i)); }
  function updateEdu(i: number, key: keyof EducationEntry, val: string) {
    set("education", cv.education.map((e, j) => j === i ? { ...e, [key]: val } : e));
  }

  function addExp() { set("experience", [...cv.experience, emptyExperience()]); }
  function removeExp(i: number) { set("experience", cv.experience.filter((_, j) => j !== i)); }
  function updateExp(i: number, key: keyof ExperienceEntry, val: string | boolean) {
    set("experience", cv.experience.map((e, j) => j === i ? { ...e, [key]: val } : e));
  }

  function addSkillFromInput() {
    const name = skillInput.trim();
    if (!name) return;
    set("skills", [...cv.skills, { name, level: "" }]);
    setSkillInput("");
  }
  function removeSkill(i: number) { set("skills", cv.skills.filter((_, j) => j !== i)); }
  function updateSkillLevel(i: number, level: string) {
    set("skills", cv.skills.map((s, j) => j === i ? { ...s, level } : s));
  }

  function addRef() { set("references", [...cv.references, emptyReference()]); }
  function removeRef(i: number) { set("references", cv.references.filter((_, j) => j !== i)); }
  function updateRef(i: number, key: keyof ReferenceEntry, val: string) {
    set("references", cv.references.map((r, j) => j === i ? { ...r, [key]: val } : r));
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const publicUrl = cv.slug ? `/cv/${cv.slug}` : null;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">CV Builder</h1>
          <p className="text-sm text-gray-400 mt-1">Upload a document to auto-fill, then edit and publish.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : "Save CV"}
        </button>
      </div>

      {/* Save feedback */}
      {saveSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
          <CheckCircle size={15} /> CV saved successfully.
        </div>
      )}
      {saveError && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={15} /> {saveError}
        </div>
      )}

      {/* ── Upload Section ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <SectionHeading icon={Sparkles} label="Import from Document" />
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
              : "border-white/15 hover:border-white/30 hover:bg-white/5"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={onFileInput}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3 text-[var(--color-accent)]">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-sm font-medium">Extracting with AI…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Upload size={28} />
              <p className="text-sm">
                <span className="text-white font-medium">Click to upload</span> or drag & drop
              </p>
              <p className="text-xs text-gray-500">PDF, DOCX, or TXT — max 5 MB</p>
            </div>
          )}
        </div>
        {uploadError && (
          <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle size={13} /> {uploadError}
          </p>
        )}
      </section>

      {/* ── Personal Info ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <SectionHeading icon={User} label="Personal Info" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" value={cv.name} onChange={(v) => set("name", v)} placeholder="Jane Smith" />
          <Field label="Tagline" value={cv.tagline} onChange={(v) => set("tagline", v)} placeholder="Senior Engineer · React & Node.js" />
          <Field label="Location" value={cv.location} onChange={(v) => set("location", v)} placeholder="London, UK" />
          <Field label="Email" value={cv.email} onChange={(v) => set("email", v)} placeholder="jane@example.com" type="email" />
          <Field label="Phone" value={cv.phone} onChange={(v) => set("phone", v)} placeholder="+44 7700 000000" />
          <Field label="Website" value={cv.website} onChange={(v) => set("website", v)} placeholder="https://janesmit.dev" />
        </div>
        <Field label="Bio / Summary" value={cv.bio} onChange={(v) => set("bio", v)} placeholder="A brief professional summary…" multiline />
      </section>

      {/* ── Social Links ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <SectionHeading icon={Globe} label="Social Links" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Linkedin size={14} className="text-gray-500 shrink-0" />
            <Field label="LinkedIn URL" value={cv.linkedin} onChange={(v) => set("linkedin", v)} placeholder="https://linkedin.com/in/…" />
          </div>
          <div className="flex items-center gap-2">
            <Github size={14} className="text-gray-500 shrink-0" />
            <Field label="GitHub URL" value={cv.github} onChange={(v) => set("github", v)} placeholder="https://github.com/…" />
          </div>
          <div className="flex items-center gap-2">
            <Twitter size={14} className="text-gray-500 shrink-0" />
            <Field label="Twitter / X URL" value={cv.twitter} onChange={(v) => set("twitter", v)} placeholder="https://x.com/…" />
          </div>
        </div>
      </section>

      {/* ── Experience ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeading icon={Briefcase} label="Experience" />
          <button
            onClick={addExp}
            className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition"
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {cv.experience.length === 0 && (
          <p className="text-sm text-gray-500 italic">No entries yet. Add one or upload a document.</p>
        )}
        {cv.experience.map((exp, i) => (
          <div key={i} className="border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02]">
            <div className="flex justify-end">
              <button onClick={() => removeExp(i)} className="text-gray-500 hover:text-red-400 transition"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Job Title" value={exp.title} onChange={(v) => updateExp(i, "title", v)} placeholder="Software Engineer" />
              <Field label="Company" value={exp.company} onChange={(v) => updateExp(i, "company", v)} placeholder="Acme Corp" />
              <Field label="From" value={exp.from} onChange={(v) => updateExp(i, "from", v)} placeholder="Jan 2020" />
              {!exp.current && (
                <Field label="To" value={exp.to} onChange={(v) => updateExp(i, "to", v)} placeholder="Dec 2023" />
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={exp.current}
                onChange={(e) => updateExp(i, "current", e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
              Currently working here
            </label>
            <Field label="Description" value={exp.description} onChange={(v) => updateExp(i, "description", v)} placeholder="Describe your responsibilities and achievements…" multiline />
          </div>
        ))}
      </section>

      {/* ── Education ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeading icon={GraduationCap} label="Education" />
          <button
            onClick={addEdu}
            className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition"
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {cv.education.length === 0 && (
          <p className="text-sm text-gray-500 italic">No entries yet.</p>
        )}
        {cv.education.map((edu, i) => (
          <div key={i} className="border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02]">
            <div className="flex justify-end">
              <button onClick={() => removeEdu(i)} className="text-gray-500 hover:text-red-400 transition"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="School / University" value={edu.school} onChange={(v) => updateEdu(i, "school", v)} placeholder="University of Oxford" />
              <Field label="Degree" value={edu.degree} onChange={(v) => updateEdu(i, "degree", v)} placeholder="BSc / MSc / PhD" />
              <Field label="Field of Study" value={edu.field} onChange={(v) => updateEdu(i, "field", v)} placeholder="Computer Science" />
              <div className="grid grid-cols-2 gap-2">
                <Field label="From" value={edu.from} onChange={(v) => updateEdu(i, "from", v)} placeholder="Sep 2016" />
                <Field label="To" value={edu.to} onChange={(v) => updateEdu(i, "to", v)} placeholder="Jun 2020" />
              </div>
            </div>
            <Field label="Description" value={edu.description} onChange={(v) => updateEdu(i, "description", v)} placeholder="Achievements, thesis, activities…" multiline />
          </div>
        ))}
      </section>

      {/* ── Skills ────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <SectionHeading icon={BookOpen} label="Skills" />
        <div className="flex gap-2">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkillFromInput(); } }}
            placeholder="Type a skill and press Enter…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors"
          />
          <button
            onClick={addSkillFromInput}
            className="px-3 py-2 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition text-sm"
          >
            <Plus size={14} />
          </button>
        </div>
        {cv.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cv.skills.map((skill, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-sm text-white">
                <span>{skill.name}</span>
                <select
                  value={skill.level}
                  onChange={(e) => updateSkillLevel(i, e.target.value)}
                  className="bg-transparent text-xs text-gray-400 focus:outline-none cursor-pointer"
                >
                  <option value="">–</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
                <button onClick={() => removeSkill(i)} className="text-gray-500 hover:text-red-400 transition ml-0.5"><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── References ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeading icon={Users} label="References" />
          <button
            onClick={addRef}
            className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition"
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {cv.references.length === 0 && (
          <p className="text-sm text-gray-500 italic">No references yet.</p>
        )}
        {cv.references.map((ref, i) => (
          <div key={i} className="border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02]">
            <div className="flex justify-end">
              <button onClick={() => removeRef(i)} className="text-gray-500 hover:text-red-400 transition"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full Name" value={ref.name} onChange={(v) => updateRef(i, "name", v)} placeholder="Dr. John Doe" />
              <Field label="Role / Position" value={ref.role} onChange={(v) => updateRef(i, "role", v)} placeholder="Head of Engineering" />
              <Field label="Company" value={ref.company} onChange={(v) => updateRef(i, "company", v)} placeholder="Acme Corp" />
              <Field label="Email" value={ref.email} onChange={(v) => updateRef(i, "email", v)} placeholder="john@acme.com" type="email" />
            </div>
          </div>
        ))}
      </section>

      {/* ── Visibility ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <SectionHeading icon={Globe} label="Visibility" />
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => set("isPublic", !cv.isPublic)}
            className={`w-11 h-6 rounded-full transition-colors relative ${cv.isPublic ? "bg-[var(--color-accent)]" : "bg-white/10"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cv.isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <div>
            <span className="text-sm text-white font-medium flex items-center gap-1.5">
              {cv.isPublic ? <Eye size={13} /> : <EyeOff size={13} />}
              {cv.isPublic ? "CV is public" : "CV is private"}
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              {cv.isPublic ? "Anyone with the link can view your CV." : "Only you can see your CV."}
            </p>
          </div>
        </label>

        {cv.isPublic && (
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Public URL slug</label>
            <div className="flex items-center gap-0 rounded-lg overflow-hidden border border-white/10 focus-within:border-[var(--color-accent)]/50">
              <span className="px-3 py-2 text-sm text-gray-500 bg-white/5 border-r border-white/10 whitespace-nowrap">
                /cv/
              </span>
              <input
                value={cv.slug}
                onChange={(e) =>
                  set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-"))
                }
                placeholder="your-name"
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white focus:outline-none placeholder-gray-500"
              />
            </div>
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition mt-1"
              >
                <ExternalLink size={12} /> View your public CV
              </a>
            )}
          </div>
        )}
      </section>

      {/* Bottom save */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-accent)] text-black font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : "Save CV"}
        </button>
      </div>
    </div>
  );
}
