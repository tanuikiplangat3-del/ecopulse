import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@welcometomorrow.io").toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "change-this-now";
  const adminName = process.env.ADMIN_NAME || "Site Admin";

  // --- Admin ---
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPass, 10),
        role: "admin",
        verified: true,
      },
    });
    console.log(`✅ Admin created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin already exists: ${adminEmail}`);
  }

  // --- Demo publisher + listings (so the marketplace isn't empty on first run) ---
  const demoEmail = "demo.publisher@welcometomorrow.io";
  let publisher = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!publisher) {
    publisher = await prisma.user.create({
      data: {
        name: "Demo Publisher",
        email: demoEmail,
        passwordHash: await bcrypt.hash("demo-publisher-123", 10),
        role: "publisher",
        verified: true,
        payoutBank: "Demo Bank — 0000000000",
      },
    });

    const demoListings = [
      { domain: "techdaily.example", country: "United States", category: "Technology,IT", dr: 62, traffic: 145000, price: 18000 },
      { domain: "financewire.example", country: "United Kingdom", category: "Banking,Investment", dr: 71, traffic: 320000, price: 32000 },
      { domain: "healthhub.example", country: "Kenya", category: "Medicine and Health", dr: 44, traffic: 52000, price: 9000 },
      { domain: "sportsbeat.example", country: "Nigeria", category: "Sports,Gambling", dr: 55, traffic: 210000, price: 15000 },
    ];
    for (const l of demoListings) {
      await prisma.listing.create({
        data: {
          publisherId: publisher.id,
          domain: l.domain,
          url: `https://${l.domain}`,
          category: l.category,
          country: l.country,
          language: "English",
          domainRating: l.dr,
          monthlyTraffic: l.traffic,
          linkType: "guest_post",
          priceCents: l.price, // e.g. 18000 = $180.00
          tatDays: 7,
          description: `Quality guest post placement on ${l.domain}. Permanent do-follow link, editorial content.`,
          status: "approved",
        },
      });
    }
    console.log(`✅ Demo publisher + ${demoListings.length} approved listings created.`);
  } else {
    console.log("ℹ️  Demo publisher already exists.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
