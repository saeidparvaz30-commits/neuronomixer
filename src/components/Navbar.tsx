// Navigation bar for the application
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="w-full bg-[var(--background)] border-b border-[var(--color-accent)] shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="hover:text-[var(--color-accent)] transition-colors duration-200"
        >
          {/* <Image   for future logo use
            src="/images/logo.png"
            alt="Neuronomixer logo"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="text-xl font-semibold text-[var(--color-primary)]"></span> */}
          Neuronomixer
        </Link>
        <ul className="flex space-x-6">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`transition-colors duration-200 ${
                  pathname === href
                    ? "text-[var(--color-accent)] font-semibold"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
