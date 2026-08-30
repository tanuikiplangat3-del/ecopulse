"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendPublisherApplicationAdmin } from "@/lib/email";

const q = (s: string) => encodeURIComponent(s);

/** Public "request to be a publisher" submission. */
export async function submitApplicationAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const urls = String(formData.get("urls") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!name) redirect(`/apply?error=${q("Please enter your name.")}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect(`/apply?error=${q("Enter a valid email address.")}`);
  if (!urls) redirect(`/apply?error=${q("List at least one website URL for review.")}`);

  await prisma.publisherApplication.create({
    data: { name, email, urls, note: note || null },
  });
  await sendPublisherApplicationAdmin({ name, email, urls });

  redirect(`/apply?success=${q("Thanks! Your request has been received. Our team will review your websites and get back to you by email.")}`);
}
