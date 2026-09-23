import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0B737A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sigma.malangkab.go.id"),
  title: "SIGMA Ecosystem — Satu Data Cegah Stunting",
  description: "Aplikasi AI dan Sistem Informasi Kesehatan (SIGMA Ecosystem) Dinas Kesehatan Kabupaten Malang untuk surveilans gizi presisi, monitoring stunting, dan analisis data kesehatan terintegrasi.",
  keywords: [
    "SIGMA Ecosystem",
    "Satu Data Cegah Stunting",
    "Aplikasi AI Kesehatan",
    "Aplikasi Stunting",
    "Surveilans Gizi",
    "Dinas Kesehatan Kabupaten Malang",
    "Platform Analitik Gizi",
    "Machine Learning Stunting",
    "Dashboard Kesehatan Digital",
    "SIGMA MBG",
    "SIGMA RCS",
    "SIGMA PKMK",
  ],
  authors: [{ name: "Dinas Kesehatan Kabupaten Malang" }],
  creator: "SIGMA Dev Team",
  publisher: "Dinas Kesehatan Kabupaten Malang",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://sigma.malangkab.go.id",
    title: "SIGMA Ecosystem — Satu Data Cegah Stunting | Kabupaten Malang",
    description: "Integrasi layanan gizi, analitik data, dan kecerdasan buatan untuk percepatan penurunan stunting Kabupaten Malang.",
    siteName: "SIGMA Ecosystem",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "SIGMA Ecosystem - Satu Data Cegah Stunting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SIGMA Ecosystem — Satu Data Cegah Stunting | Kabupaten Malang",
    description: "Integrasi layanan gizi, analitik data, dan kecerdasan buatan Dinas Kesehatan Kabupaten Malang.",
    images: ["/twitter-image.png"],
  },
  icons: {
    icon: [
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SIGMA Ecosystem",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SIGMA Ecosystem",
  "operatingSystem": "Web",
  "applicationCategory": "HealthApplication",
  "description": "Aplikasi AI dan platform terintegrasi untuk surveilans gizi komprehensif, monitoring intervensi stunting, dan analisis data kesehatan berbasis Machine Learning.",
  "provider": {
    "@type": "Organization",
    "name": "Dinas Kesehatan Kabupaten Malang"
  },
  "url": "https://sigma.malangkab.go.id",
  "featureList": [
    "Aplikasi AI Kesehatan",
    "Aplikasi Stunting Terintegrasi",
    "Aplikasi Surveilans Kesehatan",
    "Dashboard Kesehatan Digital"
  ]
};

import { AccessibilityProvider } from "@/context/AccessibilityContext";
import SkipToContent from "@/components/accessibility/SkipToContent";
import LiveAnnouncer from "@/components/accessibility/LiveAnnouncer";
import AccessibilityToolbar from "@/components/accessibility/AccessibilityToolbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="light scroll-smooth">
      <head>
        {/* Google Fonts: Public Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        {/* Material Icons */}
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen bg-[#f8fafc] text-slate-800">
        <AccessibilityProvider>
          <SkipToContent />
          <LiveAnnouncer />
          {children}
          <AccessibilityToolbar />
        </AccessibilityProvider>
      </body>
    </html>
  );
}
