import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // اجازه به درخواست‌های dev از 127.0.0.1 — بدون این، Next فقط localhost را
  // می‌پذیرد و باز کردن سایت با 127.0.0.1 باعث 403 شدن اسکریپت‌ها و
  // هایدریت‌نشدن ری‌اکت (کلیک‌های بی‌اثر) می‌شود.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
