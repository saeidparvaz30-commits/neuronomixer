// Navigation bar for the application
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/authors", label: "Authors" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-[var(--color-accent)] shadow-sm bg-[var(--background)] bg-opacity-95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-2 py-1">
        <Link
          href="/"
          className="hover:text-[var(--color-accent)] transition-colors duration-200 text-lg font-bold flex items-center space-x-2"
        >
          <Image
            src="/pictures/logo.png"
            alt="Neuronomixer logo"
            width={75}
            height={75}
            className="rounded-full"
            sizes="1460px"
          />{" "}
          <span className="text-xl font-semibold text-[var(--color-primary)]"></span>
          NeuroNomixer
        </Link>
        <ul className="flex space-x-6">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`transition-colors duration-200 ${
                  pathname === href
                    ? "text-[var(--color-accent)] font-semibold"
                    : "text-white hover:text-[var(--color-accent)]"
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
