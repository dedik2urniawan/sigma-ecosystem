import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "SIGMA Ecosystem - Aplikasi AI & Surveilans Kesehatan",
  description: "Aplikasi AI dan Sistem Informasi Kesehatan (SIGMA Ecosystem) untuk surveilans presisi, monitoring stunting, dan analisis big data kesehatan terintegrasi dengan Machine Learning.",
  keywords: [
    "Aplikasi AI",
    "Aplikasi Stunting",
    "AI Kesehatan",
    "Aplikasi Surveilans Kesehatan",
    "Sistem Informasi Kesehatan",
    "Platform Analitik Gizi",
    "Machine Learning Stunting",
    "Dashboard Kesehatan Digital",
    "Integrasi Data Kesehatan",
    "Inovasi Pelayanan Kesehatan",
  ],
  authors: [{ name: "Dinas Kesehatan Kabupaten Malang" }],
  creator: "SIGMA Dev Team",
  publisher: "Dinas Kesehatan Kabupaten Malang",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://sigma.malangkab.go.id",
    title: "SIGMA Ecosystem - Aplikasi AI Surveilans Kesehatan & Stunting",
    description: "Inovasi pelaporan stunting terintegrasi dan platform analitik big data kesehatan dengan Machine Learning.",
    siteName: "SIGMA Ecosystem",
    images: [
      {
        url: "/sigma_logo.png",
        width: 800,
        height: 600,
        alt: "SIGMA Ecosystem Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SIGMA Ecosystem - Aplikasi AI & Surveilans Kesehatan",
    description: "Inovasi pelaporan stunting terintegrasi berbasis AI.",
    images: ["/sigma_logo.png"],
  },
  icons: {
    icon: '/sigma_logo.png',
    shortcut: '/sigma_logo.png',
    apple: '/sigma_logo.png',
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
        {children}
      </body>
    </html>
  );
}
