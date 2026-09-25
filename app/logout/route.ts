import { NextResponse } from "next/server";
import { destroySession, getCurrentUser, revokeAllSessions } from "@/lib/auth";
import { appUrl } from "@/lib/stripe";

/**
 * Sign out. POST only: a GET that signs people out can be triggered by any
 * other website with an image tag. The session cookie is SameSite=Lax, so a
 * cross-site POST arrives without it and does nothing.
 *
 * Signing out ends the session on every device, not just this browser, so a
 * stolen cookie stops working the moment its owner signs out.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (user) await revokeAllSessions(user.id);
  await destroySession();
  return NextResponse.redirect(`${appUrl()}/login`, 303);
}

/** An old bookmark or link to /logout just lands on the sign-in page. */
export async function GET() {
  return NextResponse.redirect(`${appUrl()}/login`, 303);
}
