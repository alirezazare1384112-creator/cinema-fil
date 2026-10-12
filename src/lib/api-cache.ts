/**
 * درخواست‌های GET همزمانِ یک آدرس را به یک فراخوانی تبدیل می‌کند.
 *
 * مثلاً صفحهٔ «کشف» و نوار جستجو هر دو `/api/media` می‌خواهند (و در حالت dev
 * افکت‌ها دوبار هم اجرا می‌شوند) → به‌جای ۳ درخواست، فقط ۱ می‌رود.
 *
 * نکتهٔ مهم: این کش «کهنه» برنمی‌گرداند؛ فقط درخواست‌هایی که هم‌زمان در
 * راه‌اند جمع می‌شوند و بعد از پاسخ پاک می‌شود، پس داده‌های جدید (افزودن/
 * حذف رسانه) همیشه از درخواست تازه می‌آیند.
 */
const inflight = new Map<string, Promise<unknown>>()

export function sharedJson<T>(url: string): Promise<T | null> {
  const existing = inflight.get(url)
  if (existing) return existing as Promise<T | null>

  const request = fetch(url)
    .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
    .catch(() => null)
    .finally(() => {
      inflight.delete(url)
    })

  inflight.set(url, request)
  return request
}
