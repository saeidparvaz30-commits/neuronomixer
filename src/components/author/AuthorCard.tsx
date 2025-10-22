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
      transition={{ delay: index * 0.15, duration: 0.6, ease: "easeOut" }}
      className="bg-[var(--color-background)] border border-[var(--color-accent)] rounded-4xl shadow-md p-6 w-[400px] flex flex-col items-center text-center hover:shadow-lg transition-shadow"
    >
      {author.image?.asset?.url ? (
        <div className="w-32 h-32 mb-4 relative">
          <Image
            src={author.image.asset.url}
            alt={author.name || "Author profile image"}
            fill
            className="rounded-full object-cover shadow-md"
          />
        </div>
      ) : (
        <div className="w-32 h-32 mb-4 rounded-full bg-gray-800 flex items-center justify-center text-[var(--color-accent)] text-sm shadow-md">
          No Image
        </div>
      )}

      <h2 className="text-2xl font-semibold text-[var(--color-accent)] mb-2">
        {author.name}
      </h2>

      {author.shortBio && (
        <p className="text-[var(--color-text-muted)] text-sm mb-4 italic">
          {author.shortBio}
        </p>
      )}

      {/* Long Bio (optional) */}
      {author.longBio && (
        <div className="text-[var(--color-text)] text-sm mb-4 prose prose-sm max-w-none text-center">
          {author.longBio[0]?.children?.map((c: any) => c.text).join(" ")}
        </div>
      )}

      {/* Social Links */}
      <div className="flex space-x-4 mt-auto">
        {author.linkedIn && (
          <a href={author.linkedIn} target="_blank" rel="noopener noreferrer">
            <Linkedin className="text-[var(--color-primary)] hover:text-[var(--color-accent)] transition" />
          </a>
        )}
        {author.github && (
          <a href={author.github} target="_blank" rel="noopener noreferrer">
            <Github className="text-[var(--color-primary)] hover:text-[var(--color-accent)] transition" />
          </a>
        )}
        {author.twitter && (
          <a href={author.twitter} target="_blank" rel="noopener noreferrer">
            <Twitter className="text-[var(--color-primary)] hover:text-[var(--color-accent)] transition" />
          </a>
        )}
        {author.personalWebsite && (
          <a
            href={author.personalWebsite}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Globe className="text-[var(--color-primary)] hover:text-[var(--color-accent)] transition" />
          </a>
        )}
        {author.email && (
          <a href={`mailto:${author.email}`}>
            <Mail className="text-[var(--color-primary)] hover:text-[var(--color-accent)] transition" />
          </a>
        )}
      </div>
    </motion.div>
  );
}
