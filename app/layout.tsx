import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";

const SITE_URL = "https://lotto-ry.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "로또리 | 내 주변 로또 판매점 지도", template: "%s | 로또리" },
  description: "내 주변 로또 판매점과 1~5등 당첨 이력을 지도에서 찾고, 최근 로또 당첨번호와 번호 통계를 확인하는 무료 정보 서비스입니다.",
  applicationName: "로또리",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "로또리",
  },
  formatDetection: {
    telephone: false,
  },
  keywords: ["로또 판매점", "로또 지도", "주변 로또 판매점", "로또 당첨 판매점", "로또리"],
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "로또리",
    title: "로또리 | 내 주변 로또 판매점 지도",
    description: "내 주변 로또 판매점, 1~5등 당첨 이력, 최근 당첨번호와 번호 통계를 한곳에서 확인하세요.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "로또리 로또 판매점 지도" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "로또리 | 내 주변 로또 판매점 지도",
    description: "내 주변 로또 판매점과 당첨 이력을 지도에서 확인하세요.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
  verification: {
    google: "GzSKhOZfpEpV6oFZs-bJzSoU_hd3spCzLTlRisA7wyo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0F8A5F",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "로또리",
      alternateName: "LottoRy",
      url: SITE_URL,
      inLanguage: "ko-KR",
    },
    {
      "@type": "WebApplication",
      name: "로또리",
      alternateName: "LottoRy",
      url: SITE_URL,
      applicationCategory: "MapApplication",
      operatingSystem: "Web",
      inLanguage: "ko-KR",
      description: "내 주변 로또 판매점과 과거 당첨 이력을 제공하는 비공식 정보 서비스",
      isAccessibleForFree: true,
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "arpp8pekds";
  return (
    <html lang="ko">
      <head>
        <script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
          async
        />
      </head>
      <body className="bg-[#EEF1ED] text-[#17211C] antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <div className="mx-auto min-h-dvh w-full max-w-3xl overflow-x-clip bg-[#F7F8F5] sm:border-x sm:border-[#DDE3DE] shadow-sm">
          {children}
          <BottomNav />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
