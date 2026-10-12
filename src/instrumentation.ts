/**
 * یک‌بار بالا آمدن سرور → کش‌های سایت فیلم گرم می‌شوند.
 *
 * بدون await تا شروع سرور معطل دانلود چند صفحه نشود؛ فقط کار در پس‌زمینه
 * می‌ماند و اولین درخواست کاربر از کش پاسخ می‌گیرد.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  void import('./lib/f2m')
    .then((mod) => mod.warmCaches())
    .catch(() => {
      /* اگر گرم‌کردن شکست خورد بی‌اهمیت است — درخواست‌ها حالت سرد را اجرا می‌کنند */
    })
}
