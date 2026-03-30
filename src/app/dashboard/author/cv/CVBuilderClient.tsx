"use client";

import { useRef, useState } from "react";
import {
  Upload, Save, Plus, X, ExternalLink, Loader2, CheckCircle,
  AlertCircle, Globe, Linkedin, Github, Twitter, GraduationCap,
  Briefcase, Sparkles, User, BookOpen, Users, Eye, EyeOff,
  FolderOpen, Award, Star, Languages, GripVertical,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EducationEntry {
  school: string; degree: string; field: string; from: string; to: string; description: string; hidden?: boolean;
}
interface ExperienceEntry {
  company: string; title: string; from: string; to: string; current: boolean; description: string; hidden?: boolean;
}
interface SkillEntry { name: string; level: string; hidden?: boolean; }
interface ReferenceEntry { name: string; role: string; company: string; email: string; hidden?: boolean; }
interface ProjectEntry { title: string; description: string; year: string; hidden?: boolean; }
interface CertificationEntry { title: string; issuer: string; year: string; hidden?: boolean; }
interface HonorEntry { title: string; description: string; hidden?: boolean; }

interface CVData {
  name: string; tagline: string; bio: string; location: string;
  email: string; phone: string; website: string;
  linkedin: string; github: string; twitter: string; avatarUrl: string;
  birthYear: string;
  education: EducationEntry[]; experience: ExperienceEntry[];
  skills: SkillEntry[]; references: ReferenceEntry[];
  languages: string[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  honors: HonorEntry[];
  isPublic: boolean; slug: string;
  sectionVisibility: Record<string, boolean>;
}

const empty: CVData = {
  name: "", tagline: "", bio: "", location: "", email: "", phone: "",
  website: "", linkedin: "", github: "", twitter: "", avatarUrl: "",
  birthYear: "",
  education: [], experience: [], skills: [], references: [],
  languages: [], projects: [], certifications: [], honors: [],
  isPublic: false, slug: "",
  sectionVisibility: {},
};

function emptyEducation(): EducationEntry {
  return { school: "", degree: "", field: "", from: "", to: "", description: "" };
}
function emptyExperience(): ExperienceEntry {
  return { company: "", title: "", from: "", to: "", current: false, description: "" };
}
function emptySkill(): SkillEntry { return { name: "", level: "" }; }
function emptyReference(): ReferenceEntry { return { name: "", role: "", company: "", email: "" }; }
function emptyProject(): ProjectEntry { return { title: "", description: "", year: "" }; }
function emptyCertification(): CertificationEntry { return { title: "", issuer: "", year: "" }; }
function emptyHonor(): HonorEntry { return { title: "", description: "" }; }

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Convert any human-readable date string to "YYYY-MM" for <input type="month">.
 *  Handles: "Sept 2024", "September 2024", "Jan 2020", "01/2020", "2024-09-15".
 *  Returns "" for unrecognisable values (e.g. bare years or "Present"). */
function toMonthYear(s: string): string {
  if (!s) return "";
  const t = s.trim();
  // Already correct format
  if (/^\d{4}-\d{2}$/.test(t)) return t;
  // ISO date → take year-month
  const iso = t.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  // MM/YYYY or M/YYYY
  const slash = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[2]}-${slash[1].padStart(2, "0")}`;
  // "Month YYYY" or "Mon YYYY" (e.g. "Sept 2024", "January 2020")
  const wordy = t.match(/([a-z]+)\s+(\d{4})/i);
  if (wordy) {
    const mon = MONTH_MAP[wordy[1].toLowerCase().slice(0, 3)];
    if (mon) return `${wordy[2]}-${mon}`;
  }
  // "YYYY Month"
  const wordyRev = t.match(/(\d{4})\s+([a-z]+)/i);
  if (wordyRev) {
    const mon = MONTH_MAP[wordyRev[2].toLowerCase().slice(0, 3)];
    if (mon) return `${wordyRev[1]}-${mon}`;
  }
  return "";
}

function normaliseExpDates(entries: ExperienceEntry[]): ExperienceEntry[] {
  return entries.map((e) => ({
    ...e,
    from: toMonthYear(e.from),
    to: e.current ? "" : toMonthYear(e.to),
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, label, visible, onToggle }: {
  icon: React.ElementType; label: string; visible?: boolean; onToggle?: () => void;
}) {
  const shown = visible !== false;
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className={`shrink-0 ${shown ? "text-[var(--color-accent)]" : "text-gray-600"}`} />
      <h2 className={`text-sm font-semibold uppercase tracking-widest ${shown ? "text-[var(--color-accent)]" : "text-gray-600"}`}>
        {label}
      </h2>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="ml-2 shrink-0 text-gray-500 hover:text-white transition"
          title={shown ? "Hide on public CV" : "Show on public CV"}
        >
          {shown ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      )}
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

function MonthField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const base =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors [color-scheme:dark]";
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input type="month" value={value} onChange={(e) => onChange(e.target.value)} className={base} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CVBuilderClient({ initialCV, userImage }: { initialCV: CVData | null; userImage?: string | null }) {
  const [cv, setCv] = useState<CVData>(() => {
    if (!initialCV) return { ...empty, avatarUrl: userImage || "" };
    // Explicitly coerce every nullable string field to "" so React inputs are
    // always controlled (value={null} silently makes them uncontrolled).
    return {
      name: initialCV.name ?? "",
      tagline: initialCV.tagline ?? "",
      bio: initialCV.bio ?? "",
      location: initialCV.location ?? "",
      email: initialCV.email ?? "",
      phone: initialCV.phone ?? "",
      website: initialCV.website ?? "",
      linkedin: initialCV.linkedin ?? "",
      github: initialCV.github ?? "",
      twitter: initialCV.twitter ?? "",
      avatarUrl: initialCV.avatarUrl || userImage || "",
      birthYear: initialCV.birthYear ?? "",
      education: (initialCV.education as EducationEntry[]) ?? [],
      experience: normaliseExpDates((initialCV.experience as ExperienceEntry[]) ?? []),
      skills: (initialCV.skills as SkillEntry[]) ?? [],
      references: (initialCV.references as ReferenceEntry[]) ?? [],
      languages: (initialCV.languages as string[]) ?? [],
      projects: (initialCV.projects as ProjectEntry[]) ?? [],
      certifications: (initialCV.certifications as CertificationEntry[]) ?? [],
      honors: (initialCV.honors as HonorEntry[]) ?? [],
      isPublic: initialCV.isPublic ?? false,
      slug: initialCV.slug ?? "",
      sectionVisibility: (initialCV.sectionVisibility as Record<string, boolean>) ?? {},
    };
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skillDragIdx, setSkillDragIdx] = useState<number | null>(null);
  const [skillDragOver, setSkillDragOver] = useState<number | null>(null);
  const [langInput, setLangInput] = useState("");
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
        birthYear: draft.birthYear || prev.birthYear,
        education: (draft.education as EducationEntry[])?.length ? draft.education as EducationEntry[] : prev.education,
        experience: (draft.experience as ExperienceEntry[])?.length ? normaliseExpDates(draft.experience as ExperienceEntry[]) : prev.experience,
        skills: (draft.skills as SkillEntry[])?.length ? draft.skills as SkillEntry[] : prev.skills,
        references: (draft.references as ReferenceEntry[])?.length ? draft.references as ReferenceEntry[] : prev.references,
        languages: (draft.languages as string[])?.length ? draft.languages as string[] : prev.languages,
        projects: (draft.projects as ProjectEntry[])?.length ? draft.projects as ProjectEntry[] : prev.projects,
        certifications: (draft.certifications as CertificationEntry[])?.length ? draft.certifications as CertificationEntry[] : prev.certifications,
        honors: (draft.honors as HonorEntry[])?.length ? draft.honors as HonorEntry[] : prev.honors,
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

  function sortExperience(list: ExperienceEntry[]): ExperienceEntry[] {
    return [...list].sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      const toA = a.to || a.from || "0000-00";
      const toB = b.to || b.from || "0000-00";
      if (toA !== toB) return toB.localeCompare(toA);
      return (b.from || "0000-00").localeCompare(a.from || "0000-00");
    });
  }

  function addExp() { set("experience", [emptyExperience(), ...cv.experience]); }
  function removeExp(i: number) { set("experience", cv.experience.filter((_, j) => j !== i)); }
  function updateExp(i: number, key: keyof ExperienceEntry, val: string | boolean) {
    const updated = cv.experience.map((e, j) => j === i ? { ...e, [key]: val } : e);
    set("experience", key === "to" || key === "from" || key === "current" ? sortExperience(updated) : updated);
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

  function onSkillDrop(targetIdx: number) {
    if (skillDragIdx === null || skillDragIdx === targetIdx) {
      setSkillDragIdx(null); setSkillDragOver(null); return;
    }
    const next = [...cv.skills];
    const [moved] = next.splice(skillDragIdx, 1);
    next.splice(targetIdx, 0, moved);
    set("skills", next);
    setSkillDragIdx(null); setSkillDragOver(null);
  }

  function addLangFromInput() {
    const name = langInput.trim();
    if (!name || cv.languages.includes(name)) return;
    set("languages", [...cv.languages, name]);
    setLangInput("");
  }
  function removeLang(i: number) { set("languages", cv.languages.filter((_, j) => j !== i)); }

  function addRef() { set("references", [...cv.references, emptyReference()]); }
  function removeRef(i: number) { set("references", cv.references.filter((_, j) => j !== i)); }
  function updateRef(i: number, key: keyof ReferenceEntry, val: string) {
    set("references", cv.references.map((r, j) => j === i ? { ...r, [key]: val } : r));
  }

  function addProject() { set("projects", [...cv.projects, emptyProject()]); }
  function removeProject(i: number) { set("projects", cv.projects.filter((_, j) => j !== i)); }
  function updateProject(i: number, key: keyof ProjectEntry, val: string) {
    set("projects", cv.projects.map((p, j) => j === i ? { ...p, [key]: val } : p));
  }

  function addCert() { set("certifications", [...cv.certifications, emptyCertification()]); }
  function removeCert(i: number) { set("certifications", cv.certifications.filter((_, j) => j !== i)); }
  function updateCert(i: number, key: keyof CertificationEntry, val: string) {
    set("certifications", cv.certifications.map((c, j) => j === i ? { ...c, [key]: val } : c));
  }

  function addHonor() { set("honors", [...cv.honors, emptyHonor()]); }
  function removeHonor(i: number) { set("honors", cv.honors.filter((_, j) => j !== i)); }
  function updateHonor(i: number, key: keyof HonorEntry, val: string) {
    set("honors", cv.honors.map((h, j) => j === i ? { ...h, [key]: val } : h));
  }

  // ── Visibility helpers ────────────────────────────────────────────────────────

  function sectionVisible(key: string) { return cv.sectionVisibility[key] !== false; }
  function toggleSection(key: string) {
    set("sectionVisibility", { ...cv.sectionVisibility, [key]: !sectionVisible(key) });
  }
  function toggleExpHidden(i: number) {
    set("experience", cv.experience.map((e, j) => j === i ? { ...e, hidden: !e.hidden } : e));
  }
  function toggleEduHidden(i: number) {
    set("education", cv.education.map((e, j) => j === i ? { ...e, hidden: !e.hidden } : e));
  }
  function toggleSkillHidden(i: number) {
    set("skills", cv.skills.map((s, j) => j === i ? { ...s, hidden: !s.hidden } : s));
  }
  function toggleRefHidden(i: number) {
    set("references", cv.references.map((r, j) => j === i ? { ...r, hidden: !r.hidden } : r));
  }
  function toggleProjectHidden(i: number) {
    set("projects", cv.projects.map((p, j) => j === i ? { ...p, hidden: !p.hidden } : p));
  }
  function toggleCertHidden(i: number) {
    set("certifications", cv.certifications.map((c, j) => j === i ? { ...c, hidden: !c.hidden } : c));
  }
  function toggleHonorHidden(i: number) {
    set("honors", cv.honors.map((h, j) => j === i ? { ...h, hidden: !h.hidden } : h));
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const publicUrl = cv.slug ? `/cv/${cv.slug}` : null;

  return (
    <div className="flex gap-8 items-start">
      {/* ── Left: form ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">CV Builder</h1>
        <p className="text-sm text-gray-400 mt-1">Upload a document to auto-fill, then edit and publish.</p>
      </div>

      {/* ── Upload ─────────────────────────────────────────────────────────── */}
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
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={onFileInput} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3 text-[var(--color-accent)]">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-sm font-medium">Extracting with AI…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Upload size={28} />
              <p className="text-sm"><span className="text-white font-medium">Click to upload</span> or drag & drop</p>
              <p className="text-xs text-gray-500">PDF, DOCX, or TXT — max 5 MB</p>
            </div>
          )}
        </div>
        {uploadError && (
          <p className="mt-3 text-sm text-red-400 flex items-center gap-2"><AlertCircle size={13} /> {uploadError}</p>
        )}
      </section>

      {/* ── Personal Info ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <SectionHeading icon={User} label="Personal Info" visible={sectionVisible("about")} onToggle={() => toggleSection("about")} />

        {/* ── Avatar ──────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          {/* Preview */}
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--color-accent)]/30 shrink-0 flex items-center justify-center bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-black font-bold text-lg">
            {cv.avatarUrl
              ? <img src={cv.avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
              : (cv.name ? cv.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?")}
          </div>
          {/* Controls */}
          <div className="flex-1 space-y-2">
            {userImage && (
              <button
                type="button"
                onClick={() => set("avatarUrl", userImage)}
                className="flex items-center gap-2 text-xs text-[var(--color-accent)] hover:opacity-80 transition border border-[var(--color-accent)]/20 rounded-lg px-3 py-1.5 bg-[var(--color-accent)]/5"
              >
                <img src={userImage} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                Use my profile photo
              </button>
            )}
            <Field
              label="Avatar URL"
              value={cv.avatarUrl}
              onChange={(v) => set("avatarUrl", v)}
              placeholder="https://example.com/photo.jpg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" value={cv.name} onChange={(v) => set("name", v)} placeholder="Jane Smith" />
          <Field label="Tagline" value={cv.tagline} onChange={(v) => set("tagline", v)} placeholder="Senior Engineer · React & Node.js" />
          <Field label="Location" value={cv.location} onChange={(v) => set("location", v)} placeholder="London, UK" />
          <Field label="Birth Year" value={cv.birthYear} onChange={(v) => set("birthYear", v)} placeholder="1995" />
          <Field label="Email" value={cv.email} onChange={(v) => set("email", v)} placeholder="jane@example.com" type="email" />
          <Field label="Phone" value={cv.phone} onChange={(v) => set("phone", v)} placeholder="+44 7700 000000" />
          <Field label="Website" value={cv.website} onChange={(v) => set("website", v)} placeholder="https://janesmith.dev" />
        </div>
        <Field label="Bio / Summary" value={cv.bio} onChange={(v) => set("bio", v)} placeholder="A brief professional summary…" multiline />
      </section>

      {/* ── Social Links ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <SectionHeading icon={Globe} label="Social Links" visible={sectionVisible("socials")} onToggle={() => toggleSection("socials")} />
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
          <SectionHeading icon={Briefcase} label="Experience" visible={sectionVisible("experience")} onToggle={() => toggleSection("experience")} />
          <button onClick={addExp} className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition">
            <Plus size={13} /> Add
          </button>
        </div>
        {cv.experience.length === 0 && <p className="text-sm text-gray-500 italic">No entries yet. Add one or upload a document.</p>}
        {cv.experience.map((exp, i) => (
          <div key={i} className={`border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02] transition-opacity ${exp.hidden ? "opacity-40" : ""}`}>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => toggleExpHidden(i)} className="text-gray-500 hover:text-yellow-400 transition" title={exp.hidden ? "Show on public CV" : "Hide on public CV"}>
                {exp.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => removeExp(i)} className="text-gray-500 hover:text-red-400 transition"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Job Title" value={exp.title} onChange={(v) => updateExp(i, "title", v)} placeholder="Software Engineer" />
              <Field label="Company" value={exp.company} onChange={(v) => updateExp(i, "company", v)} placeholder="Acme Corp" />
              <MonthField label="From" value={exp.from} onChange={(v) => updateExp(i, "from", v)} />
              {!exp.current && <MonthField label="To" value={exp.to} onChange={(v) => updateExp(i, "to", v)} />}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
              <input type="checkbox" checked={exp.current} onChange={(e) => updateExp(i, "current", e.target.checked)} className="accent-[var(--color-accent)]" />
              Currently working here
            </label>
            <Field label="Description" value={exp.description} onChange={(v) => updateExp(i, "description", v)} placeholder="Describe your responsibilities and achievements…" multiline />
          </div>
        ))}
      </section>

      {/* ── Education ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeading icon={GraduationCap} label="Education" visible={sectionVisible("education")} onToggle={() => toggleSection("education")} />
          <button onClick={addEdu} className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition">
            <Plus size={13} /> Add
          </button>
        </div>
        {cv.education.length === 0 && <p className="text-sm text-gray-500 italic">No entries yet.</p>}
        {cv.education.map((edu, i) => (
          <div key={i} className={`border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02] transition-opacity ${edu.hidden ? "opacity-40" : ""}`}>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => toggleEduHidden(i)} className="text-gray-500 hover:text-yellow-400 transition" title={edu.hidden ? "Show on public CV" : "Hide on public CV"}>
                {edu.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => removeEdu(i)} className="text-gray-500 hover:text-red-400 transition"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="School / University" value={edu.school} onChange={(v) => updateEdu(i, "school", v)} placeholder="University of Oxford" />
              <Field label="Degree" value={edu.degree} onChange={(v) => updateEdu(i, "degree", v)} placeholder="BSc / MSc / PhD" />
              <Field label="Field of Study" value={edu.field} onChange={(v) => updateEdu(i, "field", v)} placeholder="Computer Science" />
              <div className="grid grid-cols-2 gap-2">
                <Field label="From" value={edu.from} onChange={(v) => updateEdu(i, "from", v)} placeholder="2016" />
                <Field label="To" value={edu.to} onChange={(v) => updateEdu(i, "to", v)} placeholder="2020" />
              </div>
            </div>
            <Field label="Description" value={edu.description} onChange={(v) => updateEdu(i, "description", v)} placeholder="Achievements, thesis, activities…" multiline />
          </div>
        ))}
      </section>

      {/* ── Skills ────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <SectionHeading icon={BookOpen} label="Skills" visible={sectionVisible("skills")} onToggle={() => toggleSection("skills")} />
        <div className="flex gap-2">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkillFromInput(); } }}
            placeholder="Type a skill and press Enter…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors"
          />
          <button onClick={addSkillFromInput} className="px-3 py-2 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition text-sm">
            <Plus size={14} />
          </button>
        </div>
        {cv.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cv.skills.map((skill, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => setSkillDragIdx(i)}
                onDragOver={(e) => { e.preventDefault(); setSkillDragOver(i); }}
                onDrop={() => onSkillDrop(i)}
                onDragEnd={() => { setSkillDragIdx(null); setSkillDragOver(null); }}
                className={`flex items-center gap-1.5 border rounded-full px-2 py-1 text-sm text-white transition-all cursor-grab active:cursor-grabbing select-none ${
                  skillDragIdx === i
                    ? "opacity-40 scale-95 bg-white/10 border-white/20"
                    : skillDragOver === i && skillDragIdx !== null && skillDragIdx !== i
                    ? "bg-[var(--color-accent)]/15 border-[var(--color-accent)]/50 scale-105"
                    : skill.hidden
                    ? "opacity-40 bg-white/5 border-white/10"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                {/* Position badge */}
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[10px] font-bold leading-none shrink-0">
                  {i + 1}
                </span>
                <GripVertical size={11} className="text-gray-600 shrink-0 -mx-0.5" />
                <span>{skill.name}</span>
                <select
                  value={skill.level}
                  onChange={(e) => updateSkillLevel(i, e.target.value)}
                  className="bg-transparent text-xs text-gray-400 focus:outline-none cursor-pointer"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <option value="">–</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
                <button type="button" onClick={() => toggleSkillHidden(i)} className="text-gray-500 hover:text-yellow-400 transition" title={skill.hidden ? "Show on public CV" : "Hide on public CV"}>
                  {skill.hidden ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
                <button onClick={() => removeSkill(i)} className="text-gray-500 hover:text-red-400 transition ml-0.5"><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Languages ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <SectionHeading icon={Languages} label="Languages" visible={sectionVisible("languages")} onToggle={() => toggleSection("languages")} />
        <div className="flex gap-2">
          <input
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLangFromInput(); } }}
            placeholder="Type a language and press Enter…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors"
          />
          <button onClick={addLangFromInput} className="px-3 py-2 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition text-sm">
            <Plus size={14} />
          </button>
        </div>
        {cv.languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cv.languages.map((lang, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-white">
                <span>{lang}</span>
                <button onClick={() => removeLang(i)} className="text-gray-500 hover:text-red-400 transition ml-0.5"><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Projects ──────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeading icon={FolderOpen} label="Projects" visible={sectionVisible("projects")} onToggle={() => toggleSection("projects")} />
          <button onClick={addProject} className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition">
            <Plus size={13} /> Add
          </button>
        </div>
        {cv.projects.length === 0 && <p className="text-sm text-gray-500 italic">No projects yet.</p>}
        {cv.projects.map((p, i) => (
          <div key={i} className={`border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02] transition-opacity ${p.hidden ? "opacity-40" : ""}`}>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => toggleProjectHidden(i)} className="text-gray-500 hover:text-yellow-400 transition" title={p.hidden ? "Show on public CV" : "Hide on public CV"}>
                {p.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => removeProject(i)} className="text-gray-500 hover:text-red-400 transition"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Project Title" value={p.title} onChange={(v) => updateProject(i, "title", v)} placeholder="My Open Source Tool" />
              <Field label="Year" value={p.year} onChange={(v) => updateProject(i, "year", v)} placeholder="2024" />
            </div>
            <Field label="Description" value={p.description} onChange={(v) => updateProject(i, "description", v)} placeholder="What did you build and what impact did it have?" multiline />
          </div>
        ))}
      </section>

      {/* ── Certifications ────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeading icon={Award} label="Certifications" visible={sectionVisible("certifications")} onToggle={() => toggleSection("certifications")} />
          <button onClick={addCert} className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition">
            <Plus size={13} /> Add
          </button>
        </div>
        {cv.certifications.length === 0 && <p className="text-sm text-gray-500 italic">No certifications yet.</p>}
        {cv.certifications.map((c, i) => (
          <div key={i} className={`border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02] transition-opacity ${c.hidden ? "opacity-40" : ""}`}>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => toggleCertHidden(i)} className="text-gray-500 hover:text-yellow-400 transition" title={c.hidden ? "Show on public CV" : "Hide on public CV"}>
                {c.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => removeCert(i)} className="text-gray-500 hover:text-red-400 transition"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Field label="Certification Name" value={c.title} onChange={(v) => updateCert(i, "title", v)} placeholder="AWS Solutions Architect" />
              </div>
              <Field label="Year" value={c.year} onChange={(v) => updateCert(i, "year", v)} placeholder="2024" />
              <div className="sm:col-span-3">
                <Field label="Issuer" value={c.issuer} onChange={(v) => updateCert(i, "issuer", v)} placeholder="Amazon Web Services" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Honors & Publications ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeading icon={Star} label="Honors & Publications" visible={sectionVisible("honors")} onToggle={() => toggleSection("honors")} />
          <button onClick={addHonor} className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition">
            <Plus size={13} /> Add
          </button>
        </div>
        {cv.honors.length === 0 && <p className="text-sm text-gray-500 italic">No honors or publications yet.</p>}
        {cv.honors.map((h, i) => (
          <div key={i} className={`border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02] transition-opacity ${h.hidden ? "opacity-40" : ""}`}>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => toggleHonorHidden(i)} className="text-gray-500 hover:text-yellow-400 transition" title={h.hidden ? "Show on public CV" : "Hide on public CV"}>
                {h.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => removeHonor(i)} className="text-gray-500 hover:text-red-400 transition"><X size={14} /></button>
            </div>
            <Field label="Title" value={h.title} onChange={(v) => updateHonor(i, "title", v)} placeholder="Best Paper Award — WebConf 2024" />
            <Field label="Details" value={h.description} onChange={(v) => updateHonor(i, "description", v)} placeholder="Additional context or publication details…" multiline />
          </div>
        ))}
      </section>

      {/* ── References ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeading icon={Users} label="References" visible={sectionVisible("references")} onToggle={() => toggleSection("references")} />
          <button onClick={addRef} className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition">
            <Plus size={13} /> Add
          </button>
        </div>
        {cv.references.length === 0 && <p className="text-sm text-gray-500 italic">No references yet.</p>}
        {cv.references.map((ref, i) => (
          <div key={i} className={`border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02] transition-opacity ${ref.hidden ? "opacity-40" : ""}`}>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => toggleRefHidden(i)} className="text-gray-500 hover:text-yellow-400 transition" title={ref.hidden ? "Show on public CV" : "Hide on public CV"}>
                {ref.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
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
              <span className="px-3 py-2 text-sm text-gray-500 bg-white/5 border-r border-white/10 whitespace-nowrap">/cv/</span>
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

      </div>{/* end left column */}

      {/* ── Right: sticky save panel ──────────────────────────────────────── */}
      <div className="sticky top-24 shrink-0 flex flex-col items-stretch gap-3 w-44">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 shadow-lg shadow-[var(--color-accent)]/20 w-full"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : "Save CV"}
        </button>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-3 py-2">
            <CheckCircle size={13} /> Saved successfully
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
            <AlertCircle size={13} /> {saveError}
          </div>
        )}
      </div>
    </div>
  );
}
