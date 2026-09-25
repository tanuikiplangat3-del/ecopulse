// A permanent record of what admins do: who marked what paid, who approved a
// withdrawal, who deleted a user. Shown on Admin -> Audit log. Rows are only
// ever added, never edited or removed by the app.
//
// A failure to write the record is logged loudly but never undoes the action
// itself: the action has already happened by the time this runs.

import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export async function audit(
  admin: Pick<User, "id" | "email">,
  action: string,
  target?: string | null,
  detail?: string | null
): Promise<void> {
  try {
    await prisma.adminAudit.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: action.slice(0, 100),
        target: target ? String(target).slice(0, 200) : null,
        detail: detail ? String(detail).slice(0, 1000) : null,
      },
    });
  } catch (e: any) {
    console.error(`[audit] FAILED to record "${action}" by ${admin.email} on ${target || "-"}: ${e?.message || e}`);
  }
}

/**
 * A short, safe summary of a submitted admin form for the audit log: every
 * plain field except anything that looks like a password or a file.
 */
export function formSummary(formData?: FormData | null): string | null {
  if (!formData) return null;
  const parts: string[] = [];
  formData.forEach((v, k) => {
    if (k.startsWith("$ACTION")) return;
    if (/pass|secret|token/i.test(k)) return;
    if (typeof v !== "string") return;
    const val = v.length > 120 ? v.slice(0, 120) + "..." : v;
    parts.push(`${k}=${val}`);
  });
  return parts.length ? parts.join(", ") : null;
}
