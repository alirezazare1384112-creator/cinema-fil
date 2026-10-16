import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // خروجی مستقل (پوشه standalone با server.js و node_modules کوچک) برای
  // بسته‌بندی قابل‌حمل و اجرا روی سیستم دیگر بدون نصب Next — فقط node لازم دارد
  output: "standalone",
  // اجازه به درخواست‌های dev از 127.0.0.1 — بدون این، Next فقط localhost را
  // می‌پذیرد و باز کردن سایت با 127.0.0.1 باعث 403 شدن اسکریپت‌ها و
  // هایدریت‌نشدن ری‌اکت (کلیک‌های بی‌اثر) می‌شود.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
