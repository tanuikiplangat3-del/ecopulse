import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Background } from "@/components/Background";

const SITE = "https://tools.welcometomorrow.io";
const PATH = "/ecopulse";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Welcome Tomorrow Ecopulse | Link Building Marketplace",
    template: "%s | Welcome Tomorrow Ecopulse",
  },
  description:
    "Acquire quality backlinks and guest posts from vetted African publishers. Build your backlink profile with escrow-protected orders and transparent pricing.",
  applicationName: "Welcome Tomorrow Ecopulse",
  keywords: [
    "link building", "backlinks", "guest posts", "niche edits",
    "backlink marketplace", "African publishers", "SEO", "Welcome Tomorrow",
  ],
  alternates: { canonical: `${SITE}${PATH}` },
  icons: { icon: [{ url: `${PATH}/favicon.png` }] },
  openGraph: {
    type: "website",
    title: "Welcome Tomorrow Ecopulse | Link Building Marketplace",
    description:
      "Acquire quality backlinks and guest posts from vetted African publishers. Build your backlink profile with us.",
    url: `${SITE}${PATH}`,
    siteName: "Welcome Tomorrow Ecopulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "Welcome Tomorrow Ecopulse | Link Building Marketplace",
    description: "Acquire quality backlinks and guest posts from vetted African publishers.",
  },
  robots: { index: true, follow: true },
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
      <body className="font-sans antialiased">
        <Background />
        <Nav />
        <main className="container-wt min-h-[70vh] py-12">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
