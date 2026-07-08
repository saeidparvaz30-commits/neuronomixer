const EXCLUDED_PREFIXES = [
  "/blog",
  "/visual-guides",
  "/studio",
  "/auth",
  "/api",
];

export function isPathExcludedFromGeneralPrompt(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
