// Password policy for NEW passwords (sign-up, invite acceptance, password reset).
//
// Deliberately NOT applied at sign-in: existing accounts - including the seeded
// admin - were created before this policy existed, and enforcing it at login
// would lock them out. Existing users upgrade by using "Forgot password".

export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One capital letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One small letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

/** Native HTML validation mirror of the rules above, so the browser blocks weak input too. */
export const PASSWORD_PATTERN =
  "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}";

/** Returns a human-readable problem, or null when the password is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one capital letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one small letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must include at least one special character (for example ! @ # $ %).";
  return null;
}
