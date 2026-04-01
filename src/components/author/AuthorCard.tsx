"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Linkedin, Github, Twitter, Mail, Globe, FileText } from "lucide-react";
import AuthorFollowButton from "./AuthorFollowButton";

type PortableTextChild = { text: string; _key?: string };
type PortableTextBlock = { children?: PortableTextChild[]; _key?: string };

export type Author = {
  _id: string;
  name: string;
  slug?: { current: string };
  image?: { asset?: { url: string } };
  shortBio?: string;
  longBio?: PortableTextBlock[];
  jobTitle?: string;
  employer?: string;
  education?: string;
  linkedIn?: string;
  github?: string;
  twitter?: string;
  personalWebsite?: string;
  email?: string;
};

export default function AuthorCard({
  author,
  index,
  isFollowing = false,
  isLoggedIn = false,
  cvSlug,
}: {
  author: Author;
  index: number;
  isFollowing?: boolean;
  isLoggedIn?: boolean;
  cvSlug?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.6, ease: "easeOut" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="
        relative bg-[var(--background)] border border-[var(--color-accent)]/40
        rounded-2xl shadow-md
        p-5 sm:p-6 md:p-8
        w-full max-w-sm
        flex flex-col items-center text-center
        hover:border-[var(--color-accent)] hover:shadow-[0_0_10px_var(--color-accent)]
        transition-all duration-300 mx-auto overflow-hidden
      "
    >
      {/* CV button — appears in top-right corner on hover */}
      <AnimatePresence>
        {cvSlug && hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18 }}
            className="absolute top-3 right-3 z-10"
          >
            <Link
              href={`/cv/${cvSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-[#0a0e1a] text-[12px] font-semibold hover:opacity-90 transition shadow-[0_2px_12px_rgba(212,175,55,0.35)]"
            >
              <FileText size={12} />
              View CV
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Author Image */}
      {author.image?.asset?.url ? (
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-4">
          <Image
            src={author.image.asset.url}
            alt={author.name || "Author profile image"}
            fill
            sizes="(max-width: 768px) 96px, 128px"
            className="rounded-full object-cover shadow-md"
          />
        </div>
      ) : (
        <div className="w-24 h-24 sm:w-28 sm:h-28 mb-4 rounded-full bg-gray-700 flex items-center justify-center text-[var(--color-accent)] text-xs shadow-md">
          No Image
        </div>
      )}

      {/* Name */}
      {author.slug?.current ? (
        <Link href={`/authors/${author.slug.current}`}>
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-accent)] mb-2 hover:underline">
            {author.name}
          </h2>
        </Link>
      ) : (
        <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-accent)] mb-2">
          {author.name}
        </h2>
      )}

      {/* Job title / employer / education */}
      {(author.jobTitle || author.employer) && (
        <p className="text-xs text-gray-400 mt-1 mb-0.5">
          {author.jobTitle}
          {author.jobTitle && author.employer && " · "}
          {author.employer}
        </p>
      )}
      {author.education && (
        <p className="text-xs text-gray-500 mb-1">{author.education}</p>
      )}

      {/* Short Bio */}
      {author.shortBio && (
        <p
          className="
    text-[var(--color-text-muted)] 
    text-sm sm:text-base italic 
    leading-tight whitespace-pre-line mb-2
  "
          style={{ marginTop: 0, marginBottom: 20, lineHeight: "1.0" }}
        >
          {author.shortBio.trim()}
        </p>
      )}

      {/* Long Bio */}
      {author.longBio && (
        <div className="text-gray-200 text-sm sm:text-base leading-relaxed mb-4 text-center">
          {author.longBio[0]?.children?.map((c) => c.text).join(" ")}
        </div>
      )}

      {/* Follow button */}
      <div className="mt-4 mb-2">
        <AuthorFollowButton
          authorId={author._id}
          isFollowing={isFollowing}
          isLoggedIn={isLoggedIn}
        />
      </div>

      {/* Social Links */}
      <div className="flex space-x-5 mt-auto">
        {author.linkedIn && (
          <a
            href={author.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors duration-200" />
          </a>
        )}
        {author.github && (
          <a
            href={author.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors duration-200" />
          </a>
        )}
        {author.twitter && (
          <a
            href={author.twitter}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
          >
            <Twitter className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors duration-200" />
          </a>
        )}
        {author.personalWebsite && (
          <a
            href={author.personalWebsite}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Personal Website"
          >
            <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors duration-200" />
          </a>
        )}
        {author.email && (
          <a href={`mailto:${author.email}`} aria-label="Email">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors duration-200" />
          </a>
        )}
      </div>
    </motion.div>
  );
}
