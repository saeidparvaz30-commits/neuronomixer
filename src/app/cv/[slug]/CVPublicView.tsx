"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  MapPin, Mail, Phone, Globe, Linkedin, Github, Twitter,
  GraduationCap, Briefcase, Star, Users, Copy, Check,
} from "lucide-react";
import { useState } from "react";

interface EducationEntry {
  school: string; degree: string; field: string; from: string; to: string; description: string;
}
interface ExperienceEntry {
  company: string; title: string; from: string; to: string; current: boolean; description: string;
}
interface SkillEntry { name: string; level: string; }
interface ReferenceEntry { name: string; role: string; company: string; email: string; }

interface CV {
  name?: string; tagline?: string; bio?: string; location?: string;
  email?: string; phone?: string; website?: string;
  linkedin?: string; github?: string; twitter?: string;
  education: EducationEntry[]; experience: ExperienceEntry[];
  skills: SkillEntry[]; references: ReferenceEntry[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp: any = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
  }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const slideLeft: any = {
  hidden: { opacity: 0, x: -32 },
  visible: (i = 0) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
  }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const popIn: any = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: (i = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.35, delay: i * 0.05, ease: "easeOut" },
  }),
};

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <motion.div
      className="flex items-center gap-3 mb-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
    >
      <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-[var(--color-accent)]" />
      </div>
      <h2 className="text-lg font-bold text-white tracking-wide uppercase text-sm">
        {label}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-[var(--color-accent)]/20 to-transparent" />
    </motion.div>
  );
}

function TimelineEntry({
  title, subtitle, period, description, index,
}: {
  title: string; subtitle: string; period: string; description?: string; index: number;
}) {
  return (
    <motion.div
      className="relative pl-7 pb-8 last:pb-0"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={index}
      variants={slideLeft}
    >
      {/* dot */}
      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/10" />
      {/* line */}
      <div className="absolute left-[5px] top-5 bottom-0 w-px bg-white/10 last:hidden" />

      <div className="space-y-1">
        <h3 className="text-white font-semibold text-base leading-snug">{title}</h3>
        <p className="text-[var(--color-accent)] text-sm font-medium">{subtitle}</p>
        <p className="text-xs text-gray-500">{period}</p>
        {description && (
          <p className="text-sm text-gray-400 leading-relaxed mt-2">{description}</p>
        )}
      </div>
    </motion.div>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  expert: "border-[var(--color-accent)]/50 text-[var(--color-accent)] bg-[var(--color-accent)]/5",
  intermediate: "border-[var(--color-secondary)]/40 text-[var(--color-secondary)] bg-[var(--color-secondary)]/5",
  beginner: "border-white/15 text-gray-300 bg-white/5",
};

export default function CVPublicView({ cv }: { cv: CV }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const socialLinks = [
    cv.linkedin && { href: cv.linkedin, icon: Linkedin, label: "LinkedIn" },
    cv.github && { href: cv.github, icon: Github, label: "GitHub" },
    cv.twitter && { href: cv.twitter, icon: Twitter, label: "Twitter" },
    cv.website && { href: cv.website, icon: Globe, label: "Website" },
  ].filter(Boolean) as { href: string; icon: React.ElementType; label: string }[];

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)" }}
    >
      {/* Gold top border */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, var(--color-accent), transparent)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <motion.h1
            className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {cv.name || "Anonymous"}
          </motion.h1>

          {cv.tagline && (
            <motion.p
              className="text-lg text-[var(--color-accent)] font-medium mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              {cv.tagline}
            </motion.p>
          )}

          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {cv.location && (
              <span className="flex items-center gap-1.5"><MapPin size={13} />{cv.location}</span>
            )}
            {cv.email && (
              <a href={`mailto:${cv.email}`} className="flex items-center gap-1.5 hover:text-white transition">
                <Mail size={13} />{cv.email}
              </a>
            )}
            {cv.phone && (
              <span className="flex items-center gap-1.5"><Phone size={13} />{cv.phone}</span>
            )}
          </motion.div>

          {socialLinks.length > 0 && (
            <motion.div
              className="flex items-center justify-center gap-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5 transition-all"
                >
                  <Icon size={16} />
                </a>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-20">

        {/* About */}
        {cv.bio && (
          <section>
            <SectionTitle icon={Star} label="About" />
            <motion.p
              className="text-gray-300 leading-relaxed text-base max-w-2xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              {cv.bio}
            </motion.p>
          </section>
        )}

        {/* Experience */}
        {cv.experience.length > 0 && (
          <section>
            <SectionTitle icon={Briefcase} label="Experience" />
            <div className="relative">
              {cv.experience.map((exp, i) => (
                <TimelineEntry
                  key={i}
                  index={i}
                  title={exp.title}
                  subtitle={exp.company}
                  period={exp.current ? `${exp.from} – Present` : `${exp.from}${exp.to ? ` – ${exp.to}` : ""}`}
                  description={exp.description}
                />
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {cv.education.length > 0 && (
          <section>
            <SectionTitle icon={GraduationCap} label="Education" />
            <div className="relative">
              {cv.education.map((edu, i) => (
                <TimelineEntry
                  key={i}
                  index={i}
                  title={[edu.degree, edu.field].filter(Boolean).join(" · ") || "Degree"}
                  subtitle={edu.school}
                  period={`${edu.from}${edu.to ? ` – ${edu.to}` : ""}`}
                  description={edu.description}
                />
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {cv.skills.length > 0 && (
          <section>
            <SectionTitle icon={Star} label="Skills" />
            <div className="flex flex-wrap gap-2">
              {cv.skills.map((skill, i) => (
                <motion.span
                  key={i}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={popIn}
                  className={`px-3 py-1.5 rounded-full text-sm border font-medium ${
                    LEVEL_COLORS[skill.level] ?? "border-white/15 text-gray-300 bg-white/5"
                  }`}
                >
                  {skill.name}
                  {skill.level && (
                    <span className="ml-1.5 opacity-60 text-xs font-normal capitalize">
                      {skill.level}
                    </span>
                  )}
                </motion.span>
              ))}
            </div>
          </section>
        )}

        {/* References */}
        {cv.references.length > 0 && (
          <section>
            <SectionTitle icon={Users} label="References" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cv.references.map((ref, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-1"
                >
                  <p className="text-white font-semibold">{ref.name}</p>
                  <p className="text-[var(--color-accent)] text-sm">{ref.role}</p>
                  {ref.company && <p className="text-gray-500 text-sm">{ref.company}</p>}
                  {ref.email && (
                    <a href={`mailto:${ref.email}`} className="text-xs text-gray-500 hover:text-white transition">
                      {ref.email}
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer bar ────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-[var(--color-accent)] transition font-medium">
            Hosted on <span className="text-[var(--color-accent)]">NeuroNomixer</span>
          </Link>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:border-[var(--color-accent)]/30 hover:text-white transition text-xs"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            {copied ? "Link copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
