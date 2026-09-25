// Every link a user can supply goes through here before it is stored or shown.
//
// A browser will run `javascript:` in an href when it is clicked, and React 18
// did not stop it (React 19 does, but that is a second line, not the first).
// So links from users are accepted only as real http(s) URLs, and uploaded
// files only as data: URLs of the few types we expect.

/** A clean http(s) URL, or null. */
export function safeHttpUrl(input: unknown): string | null {
  const s = String(input ?? "").trim();
  if (!s || s.length > 2000) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** For rendering: the URL if safe, otherwise undefined so no href is output. */
export function hrefOrNone(input: unknown): string | undefined {
  return safeHttpUrl(input) ?? undefined;
}

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/rtf",
  "text/rtf",
  "text/plain",
];

/** A stored upload is only ever linked if it is a data: URL of an allowed type. */
export function safeDataUrl(input: unknown, allowed: string[]): string | undefined {
  const s = String(input ?? "");
  const m = /^data:([a-z0-9.+\/-]+);base64,/i.exec(s);
  if (!m) return undefined;
  return allowed.includes(m[1].toLowerCase()) ? s : undefined;
}

/** A featured image may be an uploaded image or an https link to one. */
export function featuredImageHref(input: unknown): string | undefined {
  return safeDataUrl(input, IMAGE_TYPES) ?? hrefOrNone(input);
}
