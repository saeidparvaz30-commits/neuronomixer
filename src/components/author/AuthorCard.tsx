"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Linkedin, Github, Twitter, Mail, Globe } from "lucide-react";

export default function AuthorCard({
  author,
  index,
}: {
  author: any;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.6, ease: "easeOut" }}
      className="
        bg-[var(--background)] border border-[var(--color-accent)]/40 
        rounded-2xl shadow-md 
        p-5 sm:p-6 md:p-8 
        w-full max-w-sm 
        flex flex-col items-center text-center 
        hover:border-[var(--color-accent)] hover:shadow-[0_0_10px_var(--color-accent)] 
        transition-all duration-300 mx-auto
      "
    >
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
      <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-accent)] mb-2">
        {author.name}
      </h2>

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
          {author.longBio[0]?.children?.map((c: any) => c.text).join(" ")}
        </div>
      )}

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
