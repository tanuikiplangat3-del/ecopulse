import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const SITE = "https://tools.welcometomorrow.io";
const PATH = "/ecopulse";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Welcome Tomorrow Ecopulse | Link Building Marketplace",
  description:
    "Buy and sell quality backlinks, guest posts and niche edits from vetted publishers. Escrow-protected orders, transparent pricing, paid securely by card.",
  applicationName: "Welcome Tomorrow Ecopulse",
  alternates: { canonical: `${SITE}${PATH}` },
  icons: { icon: [{ url: `${PATH}/favicon.png` }] },
  openGraph: {
    title: "Welcome Tomorrow Ecopulse | Link Building Marketplace",
    description: "Buy and sell quality backlinks and guest posts from vetted publishers.",
    url: `${SITE}${PATH}`,
    siteName: "Welcome Tomorrow Ecopulse",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <Nav />
        <main className="container-wt min-h-[70vh] py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
