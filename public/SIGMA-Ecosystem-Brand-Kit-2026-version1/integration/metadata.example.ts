import type { Metadata, Viewport } from "next";

// Pass the verified canonical origin used by the existing deployment.
// Example: getSigmaMetadata(process.env.SITE_URL!) after validating SITE_URL.
export function getSigmaMetadata(siteUrl: string): Metadata {
  const origin = new URL(siteUrl);
  return {
    metadataBase: origin,
    applicationName: "Sigma Ecosystem",
    title: "Sigma Ecosystem | Satu Data Cegah Stunting",
    description: "Integrasi layanan gizi, analitik, dan kecerdasan buatan.",
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/icons/favicon.svg", type: "image/svg+xml" },
        { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website", locale: "id_ID", siteName: "Sigma Ecosystem",
      title: "Sigma Ecosystem | Satu Data Cegah Stunting",
      description: "Integrasi layanan gizi, analitik, dan kecerdasan buatan.",
      images: [{ url: "/social/opengraph-image.png", width: 1200, height: 630, alt: "Sigma Ecosystem dan enam layanan terintegrasi" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Sigma Ecosystem | Satu Data Cegah Stunting",
      images: ["/social/twitter-image.png"],
    },
  };
}
export const sigmaViewport: Viewport = {
  themeColor: "#0B737A",
};
