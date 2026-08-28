import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { appUrl } from "@/lib/stripe";

export async function GET() {
  destroySession();
  return NextResponse.redirect(`${appUrl()}/login`);
}
