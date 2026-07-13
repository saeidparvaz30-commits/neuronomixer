/**
 * Shared password policy for signup, password reset, and one-time admin setup.
 * Zero-dependency: length + complexity + a small common-password denylist.
 * Returns null when acceptable, otherwise a user-facing reason (no em dashes).
 */
const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789",
  "1234567890", "qwertyuiop", "iloveyou1", "admin1234", "letmein123",
  "welcome123", "changeme123", "neuronomixer",
]);

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length === 0) {
    return "Password is required.";
  }
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (password.length > 200) return "Password must be at most 200 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (COMMON.has(password.toLowerCase())) {
    return "That password is too common. Please choose a stronger one.";
  }
  return null;
}
