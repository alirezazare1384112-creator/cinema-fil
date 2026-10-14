<!--
ممنون از PR! قبل از submit، CONTRIBUTING.md رو بخون:
https://github.com/alirezazare1384112-creator/cinema-fil/blob/master/CONTRIBUTING.md
-->

## توضیح تغییرات / Description

<!-- بگو چی تغییر کرد و چرا. اگه issue هست، با `Fixes #NN` رفرنس بزن. -->

Fixes #

## نوع تغییر / Type of change

- [ ] 🐛 Bug fix (رفع باگ بدون تغییر رفتارِ قابل‌توجه)
- [ ] ✨ New feature (افزودن فیچر جدید)
- [ ] 💥 Breaking change (تغییرِ خراب‌کننده که نیاز به migration داره)
- [ ] 🎨 Theme/UI (تغییرِ ظاهری، احتمالاً باید با چند تم تست بشه)
- [ ] ⚡ Performance (بهبود سرعت)
- [ ] 📝 Docs (مستندات)
- [ ] ♻️ Refactor (بدون تغییرِ رفتار)
- [ ] 🧹 Chore (deps، configs، tooling)

## چک‌لیست قبل از ارسال / Pre-flight checklist

- [ ] `npm run lint` بدون خطا
- [ ] `npx tsc --noEmit` بدون خطا
- [ ] `npm run build` بدون خطا
- [ ] اگه UI تغییر کرد، با حداقل ۳ تم تست کردم (مثلاً `default` + `spiderman` + `matrix`)
- [ ] اگه schema تغییر کرد، `npx prisma db push` رو اجرا کردم و هنوز کار می‌کنه
- [ ] commit messageها از قاعدهٔ Conventional Commits پیروی می‌کنن
- [ ] رنگ‌ها از `var(--accent)` و tokenهای تم استفاده می‌کنن (نه رنگِ hardcode)
- [ ] UI در RTL هم درست کار می‌کنه

## اسکرین‌شات / Screenshots

<!-- اگه تغییرِ ظاهریه، قبل/بعد بذار. -->

| قبل / Before | بعد / After |
|---|---|
| | |

## نکات review / Review notes

<!-- چیزهایی که reviewer باید بدونه — تصمیم‌های طراحی، edge caseها، ... -->

## مهاجرت / Migration notes

<!-- اگه breaking change هست، کاربر باید چیکار کنه؟ -->
