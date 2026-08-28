"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { centsFromUsd } from "@/lib/money";

const q = (s: string) => encodeURIComponent(s);

export async function createListingAction(formData: FormData) {
  const user = await requireRole("publisher");
  const domain = String(formData.get("domain") || "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const url = String(formData.get("url") || `https://${domain}`).trim();
  const niches = formData.getAll("category").map(String).filter(Boolean);
  const country = String(formData.get("country") || "").trim();
  const priceUsd = parseFloat(String(formData.get("price") || "0"));
  const dr = parseInt(String(formData.get("domainRating") || "0")) || 0;
  const traffic = parseInt(String(formData.get("monthlyTraffic") || "0")) || 0;
  const linkType = String(formData.get("linkType") || "guest_post");
  const tatDays = parseInt(String(formData.get("tatDays") || "7")) || 7;
  const description = String(formData.get("description") || "").trim();

  if (!domain) redirect(`/new-listing?error=${q("Please enter your website domain.")}`);
  if (!country) redirect(`/new-listing?error=${q("Please choose a country.")}`);
  if (!priceUsd || priceUsd <= 0) redirect(`/new-listing?error=${q("Enter a valid price in USD.")}`);

  const autoApprove = (process.env.AUTO_APPROVE_LISTINGS || "true") === "true";

  await prisma.listing.create({
    data: {
      publisherId: user.id,
      domain,
      url,
      category: niches.join(","),
      country,
      language: "English",
      domainRating: dr,
      monthlyTraffic: traffic,
      linkType,
      priceCents: centsFromUsd(priceUsd),
      tatDays,
      description,
      status: autoApprove ? "approved" : "pending",
    },
  });
  revalidatePath("/my-listings");
  revalidatePath("/marketplace");
  redirect(`/my-listings?success=${q(autoApprove ? "Listing published." : "Listing submitted for review.")}`);
}

export async function deleteListingAction(formData: FormData) {
  const user = await requireRole("publisher");
  const id = parseInt(String(formData.get("id") || "0"));
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (listing && listing.publisherId === user.id) {
    await prisma.listing.delete({ where: { id } });
  }
  revalidatePath("/my-listings");
  redirect(`/my-listings?success=${q("Listing removed.")}`);
}

export async function savePayoutAction(formData: FormData) {
  const user = await requireRole("publisher");
  const payoutBank = String(formData.get("payoutBank") || "").trim();
  await prisma.user.update({ where: { id: user.id }, data: { payoutBank } });
  redirect(`/dashboard?success=${q("Payout details saved.")}`);
}
