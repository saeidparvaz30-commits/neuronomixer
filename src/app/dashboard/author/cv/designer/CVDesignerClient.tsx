"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Palette, FileText, Sliders, ArrowLeft, Loader2, Download,
  CheckCircle, AlertCircle, Sparkles, RefreshCw, ChevronDown, UserCircle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Technology & Software",
  "Finance & Banking",
  "Healthcare & Medical",
  "Creative & Design",
  "Marketing & Communications",
  "Education & Research",
  "Legal",
  "Engineering & Manufacturing",
  "Consulting",
  "Government & Public Sector",
  "Retail & E-commerce",
  "Other",
];

const CAREER_LEVELS = [
  "Entry Level / Graduate",
  "Mid-Career (3-7 years)",
  "Senior / Management",
  "Executive / C-Suite",
];

const VISUAL_STYLES = [
  { value: "clean-minimal", label: "Clean & Minimal", description: "Lots of whitespace, simple typography, understated elegance" },
  { value: "modern-bold", label: "Modern & Bold", description: "Strong colors, clear hierarchy, contemporary feel" },
  { value: "classic-traditional", label: "Classic & Traditional", description: "Timeless design, serif fonts, formal structure" },
  { value: "creative-expressive", label: "Creative & Expressive", description: "Unique layouts, distinctive visual identity, standout design" },
];

const COLOR_PREFERENCES = [
  { value: "monochrome", label: "Monochrome", preview: ["#000", "#555", "#aaa"] },
  { value: "navy-gold", label: "Navy & Gold", preview: ["#1a365d", "#d4af37", "#f5f0e8"] },
  { value: "earth-tones", label: "Earth Tones", preview: ["#5D4037", "#8D6E63", "#f5ede8"] },
  { value: "cool-blues", label: "Cool Blues", preview: ["#1565C0", "#42A5F5", "#E3F2FD"] },
  { value: "warm-tones", label: "Warm Tones", preview: ["#BF360C", "#FF8F00", "#FFF3E0"] },
  { value: "dark-elegant", label: "Dark & Elegant", preview: ["#1a1a2e", "#e94560", "#ffffff"] },
  { value: "ai-decide", label: "Let AI Decide", preview: ["#6366f1", "#8b5cf6", "#c4b5fd"] },
  { value: "custom", label: "Custom Palette", preview: [] },
];

const EMPHASIS_OPTIONS = [
  { value: "experience", label: "Work Experience" },
  { value: "education", label: "Education" },
  { value: "skills", label: "Skills & Technical Abilities" },
  { value: "projects", label: "Projects / Portfolio" },
  { value: "certifications", label: "Certifications" },
  { value: "honors", label: "Awards & Honors" },
];

const CV_LENGTHS = [
  "One Page (concise)",
  "Two Pages (detailed)",
  "Let AI Decide Based on Content",
];

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Merriweather', serif", label: "Merriweather" },
  { value: "Roboto, sans-serif", label: "Roboto" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Fira Sans', sans-serif", label: "Fira Sans" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "select" | "job-description" | "style-preferences" | "loading" | "preview";

interface StylePreferences {
  industry: string;
  careerLevel: string;
  visualStyle: string;
  colorPreference: string;
  emphasis: string[];
  cvLength: string;
  additionalNotes: string;
}

interface Design {
  styleName: string;
  description: string;
  html: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  generationsUsed: number;
  avatarUrl: string | null;
  savedDesigns: { html: string; styleName: string; description?: string }[] | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CVDesignerClient({ generationsUsed: initialUsed, avatarUrl, savedDesigns }: Props) {
  const [step, setStep] = useState<Step>(savedDesigns && savedDesigns.length > 0 ? "preview" : "select");
  const [generationsUsed, setGenerationsUsed] = useState(initialUsed);

  // Job description path
  const [jobDescription, setJobDescription] = useState("");

  // Style preferences path
  const [prefs, setPrefs] = useState<StylePreferences>({
    industry: "",
    careerLevel: "",
    visualStyle: "",
    colorPreference: "",
    emphasis: [],
    cvLength: "",
    additionalNotes: "",
  });

  // Custom palette colors (primary, secondary, background)
  const [customColors, setCustomColors] = useState(["#1a365d", "#d4af37", "#f5f0e8"]);

  // Profile picture option
  const [includePhoto, setIncludePhoto] = useState(false);

  // Results — pre-populate from saved designs if available
  const [designs, setDesigns] = useState<Design[]>(savedDesigns ?? []);
  const [tweakedHtml, setTweakedHtml] = useState<string[]>(savedDesigns?.map((d) => d.html) ?? []);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState("#1a365d");
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0].value);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [error, setError] = useState("");

  const printIframeRef = useRef<HTMLIFrameElement>(null);

  const remaining = 1 - generationsUsed;
  const limitReached = generationsUsed >= 1;

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const setPref = <K extends keyof StylePreferences>(key: K, value: StylePreferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const toggleEmphasis = (val: string) => {
    setPrefs((p) => ({
      ...p,
      emphasis: p.emphasis.includes(val) ? p.emphasis.filter((v) => v !== val) : [...p.emphasis, val],
    }));
  };

  // Apply color + font tweaks to a given HTML string
  const applyTweaks = useCallback((html: string, color: string, font: string): string => {
    // Replace --primary-color value
    let result = html.replace(
      /(--primary-color\s*:\s*)[^;]+;/g,
      `$1${color};`
    );
    // Replace --font-family value
    result = result.replace(
      /(--font-family\s*:\s*)[^;]+;/g,
      `$1${font};`
    );
    return result;
  }, []);

  // ─── Generate ─────────────────────────────────────────────────────────────

  async function generate(mode: "job-description" | "style-preferences") {
    setError("");
    setStep("loading");

    try {
      // If custom palette selected, encode the hex values into the colorPreference string
      const resolvedPrefs =
        prefs.colorPreference === "custom"
          ? { ...prefs, colorPreference: `custom:${customColors.join(",")}` }
          : prefs;

      const body =
        mode === "job-description"
          ? { mode, jobDescription, includePhoto }
          : { mode, preferences: resolvedPrefs, includePhoto };

      const res = await fetch("/api/cv/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "limit_reached") {
          setGenerationsUsed(3);
          setStep("select");
          return;
        }
        throw new Error(data.error ?? "Generation failed");
      }

      setDesigns(data.designs);
      setTweakedHtml(data.designs.map((d: Design) => d.html));
      setGenerationsUsed(3 - data.generationsRemaining);
      setSelectedIdx(null);
      setDownloadSuccess(false);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep(mode === "job-description" ? "job-description" : "style-preferences");
    }
  }

  // ─── Tweak a design ───────────────────────────────────────────────────────

  const handleSelectDesign = (idx: number) => {
    setSelectedIdx(idx);
    setSelectedColor("#1a365d");
    setSelectedFont(FONT_OPTIONS[0].value);
    setDownloadSuccess(false);
    setDownloadError("");
  };

  const handleTweak = (idx: number, color: string, font: string) => {
    const base = designs[idx]?.html ?? "";
    const updated = applyTweaks(base, color, font);
    setTweakedHtml((prev) => {
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  };

  // ─── Download ─────────────────────────────────────────────────────────────

  async function downloadPDF(idx: number) {
    setDownloading(true);
    setDownloadError("");
    setDownloadSuccess(false);

    const html = tweakedHtml[idx] ?? designs[idx]?.html ?? "";

    try {
      const res = await fetch("/api/cv/design/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });

      const isFallback = res.headers.get("X-PDF-Fallback") === "1";

      if (isFallback || res.headers.get("Content-Type")?.includes("text/html")) {
        // Client-side print fallback
        const htmlContent = await res.text();
        clientPrint(htmlContent, designs[idx]?.styleName ?? "cv");
        setDownloadSuccess(true);
      } else if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cv-${designs[idx]?.styleName?.toLowerCase().replace(/\s+/g, "-") ?? "design"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloadSuccess(true);
      } else {
        const data = await res.json();
        throw new Error(data.error ?? "Download failed");
      }
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  function clientPrint(htmlContent: string, name: string) {
    const win = window.open("", `_cv_print_${name}`, "width=900,height=1200");
    if (!win) return;
    win.document.open();
    win.document.write(htmlContent);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center">
              <Palette size={18} className="text-[var(--color-accent)]" />
            </div>
            <h1 className="text-2xl font-bold text-white">CV Designer</h1>
          </div>
          <p className="text-sm text-gray-400 ml-12">
            Generate three professional PDF-ready CV designs powered by AI.
          </p>
        </div>
        <Link
          href="/dashboard/author/cv"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition shrink-0 mt-1"
        >
          <ArrowLeft size={14} /> Back to CV Builder
        </Link>
      </div>

      {/* Generation counter */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10">
        <RefreshCw size={15} className={limitReached ? "text-red-400" : "text-[var(--color-accent)]"} />
        <span className="text-sm text-gray-300">
          {limitReached ? (
            <>
              <span className="text-red-400 font-medium">Design limit reached.</span>{" "}
              <Link href="/contact" className="text-[var(--color-accent)] hover:opacity-80 underline">
                Contact us
              </Link>{" "}
              to request additional generations.
            </>
          ) : (
            <>
              <span className="text-white font-medium">{remaining}</span> design generation{remaining !== 1 ? "s" : ""} remaining
            </>
          )}
        </span>
      </div>

      {/* ── STEP: SELECT PATH ─────────────────────────────────────────────── */}
      {step === "select" && (
        <div className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              disabled={limitReached}
              onClick={() => setStep("job-description")}
              className="group flex flex-col gap-3 p-6 rounded-2xl border border-white/10 bg-white/[0.02] text-left hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center group-hover:bg-[var(--color-accent)]/15 transition">
                <FileText size={20} className="text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="font-semibold text-white text-base">Paste Job Description</p>
                <p className="text-sm text-gray-400 mt-1">
                  AI tailors the visual tone, layout, and emphasis to match a specific role and industry.
                </p>
              </div>
              <span className="text-xs text-[var(--color-accent)] font-medium mt-auto">Recommended for targeted applications →</span>
            </button>

            <button
              disabled={limitReached}
              onClick={() => setStep("style-preferences")}
              className="group flex flex-col gap-3 p-6 rounded-2xl border border-white/10 bg-white/[0.02] text-left hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center group-hover:bg-[var(--color-accent)]/15 transition">
                <Sliders size={20} className="text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="font-semibold text-white text-base">Style Preferences</p>
                <p className="text-sm text-gray-400 mt-1">
                  Choose your industry, style, colors, and what to emphasize — AI creates three distinct looks.
                </p>
              </div>
              <span className="text-xs text-[var(--color-accent)] font-medium mt-auto">Great for general-purpose CVs →</span>
            </button>
          </div>

          {/* Profile photo option — only shown when a photo exists */}
          {avatarUrl && (
            <div
              onClick={() => !limitReached && setIncludePhoto((v) => !v)}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition cursor-pointer select-none ${
                limitReached ? "opacity-40 cursor-not-allowed" : ""
              } ${
                includePhoto
                  ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              {/* Avatar preview */}
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
                />
                {includePhoto && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                    <CheckCircle size={11} className="text-black" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Include profile picture in CV</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  AI will embed your photo in the header of each design.
                </p>
              </div>

              {/* Toggle */}
              <div
                className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                  includePhoto ? "bg-[var(--color-accent)]" : "bg-white/10"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includePhoto ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </div>
          )}

          {/* No photo nudge */}
          {!avatarUrl && !limitReached && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <UserCircle size={16} className="text-gray-600 shrink-0" />
              <p className="text-xs text-gray-600">
                Add a profile picture in your{" "}
                <Link href="/dashboard/author/cv" className="text-gray-400 hover:text-white underline transition">
                  CV Builder
                </Link>{" "}
                to include it in your designs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: JOB DESCRIPTION ────────────────────────────────────────── */}
      {step === "job-description" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <FileText size={16} className="text-[var(--color-accent)]" /> Paste Job Description
            </h2>
            <button onClick={() => setStep("select")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
              <ArrowLeft size={13} /> Back
            </button>
          </div>

          <p className="text-sm text-gray-400">
            Paste the full job posting below. The AI will tailor all three CV designs for this specific role.
          </p>

          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here…"
            rows={14}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-accent)]/50 resize-y font-mono"
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            onClick={() => generate("job-description")}
            disabled={!jobDescription.trim()}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[var(--color-accent)]/20"
          >
            <Sparkles size={15} /> Generate 3 Designs
          </button>
        </div>
      )}

      {/* ── STEP: STYLE PREFERENCES ──────────────────────────────────────── */}
      {step === "style-preferences" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-7">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Sliders size={16} className="text-[var(--color-accent)]" /> Style Preferences
            </h2>
            <button onClick={() => setStep("select")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
              <ArrowLeft size={13} /> Back
            </button>
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Industry</label>
            <div className="relative">
              <select
                value={prefs.industry}
                onChange={(e) => setPref("industry", e.target.value)}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-accent)]/50 pr-10"
              >
                <option value="" disabled className="bg-[#0f172a]">Select your industry…</option>
                {INDUSTRIES.map((i) => <option key={i} value={i} className="bg-[#0f172a]">{i}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Career Level */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Career Level</label>
            <div className="relative">
              <select
                value={prefs.careerLevel}
                onChange={(e) => setPref("careerLevel", e.target.value)}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-accent)]/50 pr-10"
              >
                <option value="" disabled className="bg-[#0f172a]">Select career level…</option>
                {CAREER_LEVELS.map((l) => <option key={l} value={l} className="bg-[#0f172a]">{l}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Visual Style — card selectors */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Visual Style</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {VISUAL_STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setPref("visualStyle", s.value)}
                  className={`text-left px-4 py-3 rounded-xl border transition ${
                    prefs.visualStyle === s.value
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-gray-300 hover:border-white/20"
                  }`}
                >
                  <p className="font-medium text-sm">{s.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Color Preference — card selectors */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Color Preference</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COLOR_PREFERENCES.map((c) => {
                const isSelected = prefs.colorPreference === c.value;
                if (c.value === "custom") {
                  return (
                    <button
                      key="custom"
                      type="button"
                      onClick={() => setPref("colorPreference", "custom")}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition ${
                        isSelected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <div className="flex gap-0.5 shrink-0">
                        {customColors.map((hex, i) => (
                          <div key={i} className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: hex }} />
                        ))}
                      </div>
                      <span className={`text-xs font-medium truncate ${isSelected ? "text-[var(--color-accent)]" : "text-gray-300"}`}>
                        Custom Palette
                      </span>
                    </button>
                  );
                }
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setPref("colorPreference", c.value)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition ${
                      isSelected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <div className="flex gap-0.5 shrink-0">
                      {c.preview.map((hex) => (
                        <div key={hex} className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: hex }} />
                      ))}
                    </div>
                    <span className={`text-xs font-medium truncate ${isSelected ? "text-[var(--color-accent)]" : "text-gray-300"}`}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom palette color pickers — shown when "Custom Palette" is selected */}
            {prefs.colorPreference === "custom" && (
              <div className="mt-3 p-4 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 space-y-3">
                <p className="text-xs text-gray-400 font-medium">Pick your palette colors</p>
                {[
                  { label: "Primary", idx: 0 },
                  { label: "Secondary", idx: 1 },
                  { label: "Background", idx: 2 },
                ].map(({ label, idx }) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
                    <input
                      type="color"
                      value={customColors[idx]}
                      onChange={(e) => {
                        const next = [...customColors];
                        next[idx] = e.target.value;
                        setCustomColors(next);
                      }}
                      className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                    />
                    <span className="text-xs text-gray-500 font-mono">{customColors[idx]}</span>
                    <div className="ml-auto w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: customColors[idx] }} />
                  </div>
                ))}
                <p className="text-[11px] text-gray-600 pt-1">
                  AI will use these exact colors across all three designs.
                </p>
              </div>
            )}
          </div>

          {/* Emphasis — multi-select checkboxes */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Sections to Emphasize</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EMPHASIS_OPTIONS.map((o) => (
                <label key={o.value} onClick={() => toggleEmphasis(o.value)} className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                      prefs.emphasis.includes(o.value)
                        ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                        : "border-white/20 bg-white/5"
                    }`}
                  >
                    {prefs.emphasis.includes(o.value) && (
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-black" fill="currentColor">
                        <polyline points="2,6 5,9 10,3" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-300">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CV Length — radio buttons */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">CV Length</label>
            <div className="flex flex-col gap-2">
              {CV_LENGTHS.map((l) => (
                <label key={l} onClick={() => setPref("cvLength", l)} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                      prefs.cvLength === l ? "border-[var(--color-accent)]" : "border-white/20"
                    }`}
                  >
                    {prefs.cvLength === l && <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />}
                  </div>
                  <span className="text-sm text-gray-300">{l}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Additional Notes <span className="text-gray-600 normal-case">(optional)</span></label>
            <textarea
              value={prefs.additionalNotes}
              onChange={(e) => setPref("additionalNotes", e.target.value)}
              placeholder="Any specific requests or things to avoid…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-accent)]/50 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            onClick={() => generate("style-preferences")}
            disabled={!prefs.industry || !prefs.careerLevel || !prefs.visualStyle || !prefs.colorPreference || !prefs.cvLength}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[var(--color-accent)]/20"
          >
            <Sparkles size={15} /> Generate 3 Designs
          </button>
        </div>
      )}

      {/* ── STEP: LOADING ─────────────────────────────────────────────────── */}
      {step === "loading" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center">
              <Loader2 size={28} className="text-[var(--color-accent)] animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-white text-lg">Designing your CVs…</p>
            <p className="text-sm text-gray-400 mt-1">This may take a moment. Please don't close this page.</p>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[var(--color-accent)]/40"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── STEP: PREVIEW ─────────────────────────────────────────────────── */}
      {step === "preview" && designs.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Your 3 Designs</h2>
            {remaining > 0 && (
              <button
                onClick={() => setStep("select")}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition"
              >
                <RefreshCw size={13} /> Generate new set
              </button>
            )}
          </div>

          {/* Design cards */}
          <div className="grid lg:grid-cols-3 gap-5">
            {designs.map((design, idx) => {
              const isSelected = selectedIdx === idx;
              return (
                <div
                  key={idx}
                  className={`flex flex-col rounded-2xl border transition overflow-hidden ${
                    isSelected
                      ? "border-[var(--color-accent)]/60 ring-1 ring-[var(--color-accent)]/30"
                      : "border-white/10"
                  }`}
                >
                  {/* Name badge */}
                  <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white text-sm">{design.styleName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{design.description}</p>
                    </div>
                    <span className="text-xs text-gray-600 shrink-0">#{idx + 1}</span>
                  </div>

                  {/* iframe preview */}
                  <div className="relative bg-white overflow-hidden" style={{ height: 320 }}>
                    <iframe
                      srcDoc={tweakedHtml[idx] ?? design.html}
                      sandbox=""
                      className="w-full origin-top-left"
                      style={{ height: 900, transform: "scale(0.355)", transformOrigin: "0 0", width: "210mm", pointerEvents: "none" }}
                      title={`CV Design ${idx + 1}: ${design.styleName}`}
                    />
                  </div>

                  {/* Actions */}
                  <div className="p-4 bg-white/[0.02] border-t border-white/10 flex flex-col gap-3">
                    <button
                      onClick={() => isSelected ? setSelectedIdx(null) : handleSelectDesign(idx)}
                      className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition ${
                        isSelected
                          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
                          : "bg-white/5 text-gray-300 border border-white/10 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {isSelected ? "✓ Selected" : "Select & Customize"}
                    </button>

                    {isSelected && (
                      <div className="space-y-3 pt-1">
                        {/* Color picker */}
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-gray-400 w-24 shrink-0">Primary color</label>
                          <input
                            type="color"
                            value={selectedColor}
                            onChange={(e) => {
                              setSelectedColor(e.target.value);
                              handleTweak(idx, e.target.value, selectedFont);
                            }}
                            className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                          />
                          <span className="text-xs text-gray-500 font-mono">{selectedColor}</span>
                        </div>

                        {/* Font picker */}
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-gray-400 w-24 shrink-0">Font</label>
                          <div className="relative flex-1">
                            <select
                              value={selectedFont}
                              onChange={(e) => {
                                setSelectedFont(e.target.value);
                                handleTweak(idx, selectedColor, e.target.value);
                              }}
                              className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none pr-6"
                            >
                              {FONT_OPTIONS.map((f) => (
                                <option key={f.value} value={f.value} className="bg-[#0f172a]">{f.label}</option>
                              ))}
                            </select>
                            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* Download button */}
                        <button
                          onClick={() => downloadPDF(idx)}
                          disabled={downloading}
                          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 shadow-lg shadow-[var(--color-accent)]/20"
                        >
                          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          {downloading ? "Preparing PDF…" : "Download as PDF"}
                        </button>

                        {downloadSuccess && (
                          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-3 py-2">
                            <CheckCircle size={12} /> Your CV is downloading!
                          </div>
                        )}
                        {downloadError && (
                          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                            <AlertCircle size={12} /> {downloadError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hidden iframe for print fallback */}
          <iframe ref={printIframeRef} className="hidden" title="print-frame" />

          <p className="text-xs text-gray-600 text-center">
            Tip: Select a design, then adjust colors and font before downloading. Tweaks happen instantly in the preview.
          </p>
        </div>
      )}
    </div>
  );
}
