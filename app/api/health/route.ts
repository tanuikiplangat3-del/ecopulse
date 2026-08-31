import { NextResponse } from "next/server";

// Lightweight health check for the ALB target group.
// Reachable at /linktomorrow/api/health (basePath applied).
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, service: "linktomorrow" });
}
