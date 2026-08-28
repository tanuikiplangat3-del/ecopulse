// Coerce a Next.js searchParams value (string | string[] | undefined) to a single string.
export function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}
