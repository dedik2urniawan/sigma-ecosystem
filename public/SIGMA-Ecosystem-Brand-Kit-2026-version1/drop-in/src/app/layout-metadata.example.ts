import type { Metadata, Viewport } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "SIGMA Ecosystem",
  title: {
    default: "SIGMA Ecosystem",
    template: "%s | SIGMA Ecosystem",
  },
  description: "AI & Health Technology Ecosystem",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "SIGMA Ecosystem",
    title: "SIGMA Ecosystem",
    description: "AI & Health Technology Ecosystem",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "SIGMA Ecosystem — AI & Health Technology Ecosystem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SIGMA Ecosystem",
    description: "AI & Health Technology Ecosystem",
    images: ["/twitter-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EFF9FF" },
    { media: "(prefers-color-scheme: dark)", color: "#17274D" },
  ],
};

