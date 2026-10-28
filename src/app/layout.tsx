import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_URL = "https://github.com/alirezazare1384112-creator/cinema-fil";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "سینمافیل — Vault و رسانه",
    template: "%s · سینمافیل",
  },
  description:
    "هابِ شخصیِ فیلم و سریال — ردیابیِ تماشا، مدیریت فایل‌های محلی، گالریِ ویرایش‌ها و نقل‌قول‌ها، با ۹ تمِ حرفه‌ای (مرد عنکبوتی، بتمن، ماتریکس، ...). ۱۰۰٪ محلی روی کامپیوتر خودتان.",
  keywords: [
    "سینمافیل",
    "فیلم",
    "سریال",
    "TMDB",
    "IMDb",
    "Rotten Tomatoes",
    "Metacritic",
    "پوستر",
    "آزمایشگاه",
    "تم",
    "Next.js",
    "Prisma",
    "Personal Library",
    "Movie Tracker",
  ],
  authors: [{ name: "Alireza Zare", url: "https://github.com/alirezazare1384112-creator" }],
  creator: "Alireza Zare",
  publisher: "Alireza Zare",
  applicationName: "Cinephile Vault",
  category: "entertainment",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: undefined,
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: SITE_URL,
    siteName: "Cinephile Vault",
    title: "سینمافیل — Vault و رسانه",
    description:
      "هابِ شخصیِ فیلم و سریال با ۹ تمِ حرفه‌ای (مرد عنکبوتی، بتمن، ...) و نمره‌های IMDb / Rotten Tomatoes / Metacritic. ۱۰۰٪ محلی.",
    images: [
      {
        url: "/placeholder-poster.svg",
        width: 1200,
        height: 630,
        alt: "Cinephile Vault",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "سینمافیل — Vault و رسانه",
    description:
      "هابِ شخصیِ فیلم و سریال با ۹ تمِ حرفه‌ای و نمره‌های IMDb / RT / Metacritic. ۱۰۰٪ محلی.",
    images: ["/placeholder-poster.svg"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={`${inter.variable} h-full antialiased`}>
      <head>
        {/* اعمال تم ذخیره‌شده قبل از رندر تا چشمکِ رنگ پیش‌فرض دیده نشود */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cinema_theme');document.documentElement.setAttribute('data-theme',t||'default');}catch(e){document.documentElement.setAttribute('data-theme','default');}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <ErrorBoundary>
          <ToastProvider>
            <Sidebar />
            <main className="mr-64 min-h-screen">
              {children}
            </main>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
