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
      <body className="min-h-full bg-[#0a0a0f]">
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
