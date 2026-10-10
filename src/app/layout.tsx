import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "سینمافیل - Vault و رسانه",
  description: "ردیابی شخصی فیلم و سریال، مدیریت رسانه محلی و گالری محتوای طرفداران",
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
        <ToastProvider>
          <Sidebar />
          <main className="mr-64 min-h-screen">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
