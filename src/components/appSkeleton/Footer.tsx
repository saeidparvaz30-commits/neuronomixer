// app/components/Footer.tsx
import Link from "next/link";
import { Mail, Linkedin, Github, ExternalLink, Twitter } from "lucide-react";
import blogPosts from "../../data/highlightsFooter.json";
import Image from "next/image";

export default function Footer() {
  return (
    <footer
      className="relative w-full bg-[var(--background)] text-[var(--color-text-muted)] mt-1
      border-t-2 border-[var(--color-accent)] 
      before:content-[''] before:absolute before:-top-[6px] before:left-0 
      before:w-full before:border-t before:border-[var(--color-accent)]"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 px-0 py-8 relative">
        {/* ===== Left Column ===== */}
        <div className="flex flex-col md:flex-row md:items-start gap-6 relative">
          {/* === Logo (hidden on small screens) === */}
          <div className="absolute w-48 h-48 left-0 top-0 hidden md:block">
            <Image
              src="/pictures/Logo.png"
              alt="NeuroNomixer logo"
              fill
              className="object-contain opacity-90"
              sizes="(max-width: 700px) 0px, 200px"
              priority
            />
          </div>

          {/* === Text & Links block === */}
          <div className="md:ml-56">
            {/* Navigation / Branding */}
            <ul className="flex items-center flex-wrap space-x-4 mt-2">
              <li className="mr-8 font-bold text-[var(--color-primary)] text-md">
                <Link
                  href="/"
                  className="hover:text-[var(--color-accent)] transition-colors duration-200"
                >
                  NeuroNomixer
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/authors"
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  Authors
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-[var(--color-accent)] transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>

            <p className="mt-2 text-sm italic text-[var(--color-text-muted)] max-w-md">
              Exploring the intersection of AI, data & risk analytics.
            </p>

            {/* Contact Links */}
            <div className="mt-4 text-sm flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href="mailto:saeid.sheikhi@neuronomixer.com"
                className="flex items-center space-x-1 hover:text-[var(--color-accent)] transition-colors"
              >
                <Mail size={14} className="text-[var(--color-accent)]" />
                <span>Email</span>
              </a>

              <span>|</span>

              <a
                href="https://www.linkedin.com/in/saeid-sheikhi-aa2110149/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 hover:text-[var(--color-accent)] transition-colors"
              >
                <Linkedin size={14} className="text-[var(--color-accent)]" />
                <span>LinkedIn</span>
              </a>

              <span>|</span>

              <a
                href="https://github.com/saeidparvaz30-commits"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 hover:text-[var(--color-accent)] transition-colors"
              >
                <Github size={14} className="text-[var(--color-accent)]" />
                <span>GitHub</span>
              </a>

              <span>|</span>

              <a
                href="https://x.com/SaeidSheikhi_"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 hover:text-[var(--color-accent)] transition-colors"
              >
                <Twitter size={14} className="text-[var(--color-accent)]" />
                <span>X</span>
              </a>
            </div>

            <p className="mt-6 text-xs text-[var(--color-text-muted)]">
              © 2025 Saeid Sheikhi — Built with Next.js & Tailwind CSS
            </p>
          </div>
        </div>

        {/* ===== Right Column: Blog Highlights ===== */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3">
            Highlights
          </h3>
          <ul className="space-y-2 text-sm">
            {blogPosts.map((post) => {
              const isExternal = post.href.startsWith("http");
              const linkClasses =
                "hover:text-[var(--color-accent)] transition-colors block";

              return (
                <li key={post.href}>
                  {isExternal ? (
                    <a
                      href={post.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClasses}
                    >
                      • {post.title}
                      <ExternalLink
                        size={12}
                        className="inline-block ml-1 text-[var(--color-accent)]"
                      />
                    </a>
                  ) : (
                    <Link href={post.href} className={linkClasses}>
                      • {post.title}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </footer>
  );
}
