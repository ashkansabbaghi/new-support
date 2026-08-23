# پیشنهادهای بحرانی بک‌اند (B1–B8)

مخاطب: تیم بک‌اند. تغییر **حداقلی و additive** روی همان aggregateها. بازنویسی ABR، GraphQL، یا جایگزینی `Support.Chat` پیشنهاد نمی‌شود. Ticket موجودیت جدا نیست؛ «Ticket API» لازم نیست.

این wishlist نیست. بدون این‌ها embed چندکلاینتهٔ وب یا کنسول staff روی مرورگر موبایل مسدود یا بسیار پرریسک است.

## ۱. خلاصه اجرایی

پلن پیش‌فرض فرانت: **بک‌اند در V1 عوض نمی‌شود.** V1 وب است (دسکتاپ و مرورگر موبایل؛ کنسول staff واکنش‌گرا). درخواست: B1–B4 را تأیید یا با کار حداقل ببندید؛ B5–B8 کیفیت embed و مرورگر موبایل را تعیین می‌کنند.

خط زمانی در [ONBOARDING](./ONBOARDING.md) و [ARCHITECTURE](./ARCHITECTURE.md): فاز ۰–۲ فقط SupportGateway روی `$app`؛ فاز ۲–۳ additive روی ABR (همین B1–B8)؛ فاز ۴+ REST / OpenAPI سرویس NestJS با ABR پشت API.

## ۲. زمینه کوتاه

دو کلاینت وب امروز به این‌ها قفل‌اند. میزبان شخص ثالث `$app` میزبان Vue را embed نمی‌کند. پنل کارشناس روی مرورگر موبایل باید کامل و واکنش‌گرا باشد، نه فقط reply.

| لایه | وضعیت فعلی |
| --- | --- |
| دامنه | `$app.Support.Chat` / `Message` / `Department` / `FAQ` / `Predetermined` |
| جانبی | `$app.User.Staff`، `$app.Mastering.File` |
| command | `.await('opened' \| 'queued' \| 'closed' \| 'messageSent' \| 'processing' \| 'conveyed')` |
| حضور | `avail` / `unAvail` و `availed` / `unAvailed` |
| auth آپلود | هدر `authorization` با مقدار کوکی `user-token` یا `staff-token` |
| کشف host | از `window.location`؛ استثنا: `m.nipoto.org` → `b.nipoto.org` |
| فایل | REST `POST /file/upload/support` و `/support/upload` با JSON base64 |
| نوتیف | فقط `Notification` مرورگر |
| لیست Ticket | اگر نقش `supportManager` نباشد، کلاینت `filter.staff` را خودش می‌گذارد |

## ۳. جدول B1–B8

ستون «وضعیت» را تیم بک‌اند پر می‌کند: «تأییدشده»، «رد شده» (با دلیل کوتاه)، یا «در حال بررسی». تا پاسخ نیامده مقدار پیش‌فرض «در انتظار پاسخ بک‌اند» است؛ این سند snapshot یک‌بارمصرف نیست.

| کد | موضوع | اولویت | نوع تغییر | وضعیت |
| --- | --- | --- | --- | --- |
| B1 | قرارداد چندکلاینته پایدار روی همان ABR | P0 | مستند + در صورت نیاز client غیر Vue / ضمانت سازگاری | در انتظار پاسخ بک‌اند |
| B2 | Auth قابل استفاده در embed / iframe (نه فقط کوکی + hostname) | P0 | additive: bearer + refresh + نقش از API | در انتظار پاسخ بک‌اند |
| B3 | نوتیف وقتی تب مرورگر موبایل در پس‌زمینه است | P0 | رفتار reconnect / Notification؛ کانال رویداد جدید نه | در انتظار پاسخ بک‌اند |
| B4 | Authorization سمت سرور برای list / filter / convey | P0 | تأیید؛ اگر نیست، enforce | در انتظار پاسخ بک‌اند |
| B5 | معناشناسی availability وقتی تب در پس‌زمینه / منجمد است | P1 | تعریف رفتار + در صورت نیاز hook قطع اتصال | در انتظار پاسخ بک‌اند |
| B6 | آپلود فایل مناسب مرورگر موبایل روی همان REST path | P1 | multipart + محدودیت رسمی + HEIC | در انتظار پاسخ بک‌اند |
| B7 | نام و payload رویداد یکدست برای Chat و UI Ticket | P1 | یکسان‌سازی نام؛ موجودیت جدید نه | در انتظار پاسخ بک‌اند |
| B8 | ماتریس محیط / کشف host برای widget و flavorها | P1 | جدول رسمی؛ endpoint کشف اختیاری | در انتظار پاسخ بک‌اند |

## ۴. هر B

### B1 — قرارداد چندکلاینته پایدار (P0)

**چیست**

- تنها راه مصرف امروز: `$app` داخل اپ Vue میزبان؛ query / command / event همان ABR
- کلاینت مستقل، سند پروتکل، و SDK غیر Vue برای این دامنه در محصول وب وجود ندارد
- میزبان شخص ثالث و iframe نمی‌توانند host Vue را embed کنند؛ wrap تایپ‌اسکریپتی `$app` همچنان به میزبان فعلی وابسته‌اند

**پیشنهاد**

1. سند پروتکل برای Chat، Message، Department، FAQ، Predetermined + `User.Staff` و `Mastering.File` در حد Support
2. جدول command → رویداد await
3. این نام‌ها بدون version bump عوض نشوند
4. اگر کلاینت رسمی غیر Vue در ABR هست، همان را expose کنید؛ چیز جدید نسازید
5. ABR، مدل Chat، صف و convey را دوباره نسازید

**اگر نشود**

فرانت سطح SDK (نام command، await، payload) را می‌نویسد و هر میزبان وب سوم حدس می‌زند. هر تغییر کوچک ABR دو کلاینت را می‌شکند؛ سازگاری نسخه‌ای نیست.

### B2 — Auth غیرکوکی (P0)

**چیست**

- توکن در کوکی `user-token` / `staff-token`
- تشخیص staff از hostname (`staff` در host)
- نقش ویجت از Vuex میزبان (`auth/checkRoles` با `supporter`)
- آپلود همان مقدار کوکی را در `authorization` می‌گذارد
- iframe cross-origin و Safari موبایل کوکی میزبان را share نمی‌کنند؛ hostname میزبان برای widget origin معتبر نیست

**پیشنهاد**

Additive، نه جایگزینی یک‌شبه وب:

1. access token در `Authorization` (همان هدر آپلود امروز)
2. refresh قابل استفاده پس از handshake / `SESSION_SET`
3. تفکیک صریح `side=user | staff` در صدور توکن
4. پروفایل / نقش از API: `supporter` / `supportManager` / `technicalManager`
5. وب same-site فعلاً کوکی را نگه دارد؛ مدل هویت موازی نسازید

**اگر نشود**

embed شخص ثالث و مرورگر موبایل به cookie jar میزبان وابسته‌اند — شکننده و وابسته به ITP. بدون نقش از API هر کلاینت سوم نقش را جعل می‌کند.

### B3 — نوتیف وقتی تب در پس‌زمینه است (P0)

**چیست**

- realtime همان ABR / WS؛ نوتیف فرانت `Notification` مرورگر + `beep.js`؛ badge در حافظه
- روی مرورگر موبایل، تب staff ممکن است در پس‌زمینه برود یا منجمد شود؛ WS پایدار نمی‌ماند
- کارشناس on-call باید صف، پیام و convey را ببیند

**پیشنهاد**

1. روشن شود رویدادهای دامنه وقتی کلاینت وب در پس‌زمینه است چگونه پس از بازگشت تب reconcile می‌شوند (reconnect + history)
2. حداقل معنا: پیام جدید روی Chat فعال / منتظر، Chat queued برای staff available، بسته شدن Chat
3. payload رویداد پایدار: `chatId` + نوع، هم‌نام با B1 / B7
4. وب فعلاً `Notification` مرورگر؛ کانال رویداد جدید نسازید

**اگر نشود**

کارشناس روی موبایل باید تب را باز نگه دارد؛ کاربر فقط در جلسهٔ فعال پیام می‌بیند.

### B4 — Authorization سمت سرور (P0)

**چیست**

- غیرمدیر در UI فیلتر `filter.staff` را روی خودش می‌گذارد؛ manager می‌تواند خالی بگذارد
- convey به `$app.Support.Chat(id).convey(data)` می‌رود
- از فرانت قطعی نیست که حذف فیلتر دادهٔ دیگران را برگرداند

**پیشنهاد**

1. تأیید کتبی برای `lists.chat`، `getOpenChats`، `getClosedChats`، `countOpenChats`، `convey`
2. اگر enforce نیست: غیرمدیر بدون توجه به body فقط Chatهای مجاز؛ convey خارج از مجوز رد شود
3. مدیر همان قابلیت فعلی
4. نقش از توکن / سشن، نه فیلد دلخواه کلاینت
5. اگر امروز درست است، خروجی فقط تأیید است. مدل نقش جدا نسازید

**اگر نشود**

امنیت با خوش‌رفتاری کلاینت. ویجت سوم و هر کلاینت embed این فیلتر UI را ندارند مگر خودشان تکرار کنند — نشتی داده.

### B5 — Availability در پس‌زمینهٔ تب (P1)

**چیست**

- حضور با `avail` / `unAvail`؛ ویجت کاربر به `availed` / `unAvailed` گوش می‌دهد
- صف و اپراتور آنلاین به همین وصل است
- قطع WS وقتی تب موبایل پنهان یا منجمد است معادل `unAvail` بودن یا نبودن از فرانت مشخص نیست
- اگر available بماند چت به کسی می‌رسد که پشت تب نیست؛ اگر با هر قطع WS فوراً unavailable شود با بازگشت تب و B3 تناقض می‌آید

**پیشنهاد**

1. تعریف رسمی foreground / background (Page Visibility / freeze مرورگر)
2. اگر ABR قطع شد، سرور بعد از timeout staff را unavailable کند (یا heartbeat)
3. روشن شود `Notification` مرورگر به staff unavailable هم معنا دارد یا فقط available
4. وب رفتار فعلی را تا حد ممکن حفظ کند؛ سرویس presence جدا نسازید

**اگر نشود**

کلاینت وب در `visibilitychange` خودش `unAvail` می‌فرستد؛ اگر تب کشته شود فرمان نمی‌رسد. صف دروغین یا از دست رفتن کارشناس.

### B6 — آپلود مرورگر موبایل روی همان path (P1)

**چیست**

- REST موجود، نه ABR: `POST {back}/file/upload/support` و `POST {back}/support/upload`
- body: JSON با `file` به‌صورت base64؛ هدر `authorization: <token>`
- ویجت عملاً `jpg,jpeg,png`؛ خطای avatar: `WRONG_FILE_TYPE`، `MAXIMUM_FILE_SIZE_LIMIT` (سقف UI ۶ مگابایت)
- بعد از آپلود: `sendFile` + `await('messageSent')`؛ thumbnail از `Mastering.File.lists.support`
- محدودیت حجم / MIME در کلاینت پخش است؛ HEIC خروجی رایج Safari موبایل امروز رد می‌شود
- اگر B2 حل شود هدر فعلی احتمالاً کافی است

**پیشنهاد**

Additive روی **همان URLها** تا وب نشکند:

1. پذیرش `multipart/form-data` در کنار JSON فعلی
2. جدول رسمی MIME و سقف برای attachment و avatar
3. سیاست HEIC: تبدیل سرور یا «کلاینت تبدیل کند»
4. همان هدر بعد از B2؛ سرویس فایل جدید نسازید

**اگر نشود**

کلاینت همان JSON base64 را می‌فرستد و HEIC را روی دستگاه به JPEG تبدیل می‌کند. عکس بزرگ از رول دوربین مرورگر موبایل ضعیف می‌ماند. base64 روی عکس بزرگ حافظه را می‌ترکاند.

### B7 — نام و payload رویداد یکدست (P1)

**چیست**

- یک موجودیت: Chat؛ لایهٔ UI دو نام برای پیام جدید دارد
- ویجت `NEW_MESSAGE`؛ صفحات Ticket `NEW_TICKETS_MESSAGE` (producer واضح در فرانت دیده نشد)
- ABR در staff: `chatOpen`، `chatClosed`، `messageSent`، `seenMessage` و مشابه
- commandها به `opened` / `queued` / `closed` / `messageSent` / `processing` / `conveyed` await می‌کنند
- اگر سرور دو نام جدا بدهد فرانت فقط alias می‌سازد و drift برمی‌گردد

**پیشنهاد**

1. فهرست رسمی رویداد ABR با payload پایدار (`chatId`، `messageId`، …)
2. یک نام برای پیام جدید روی همان Chat؛ نام جدا برای Ticket اضافه نکنید
3. اگر `NEW_TICKETS_MESSAGE` سمت سرور است deprecate شود؛ اگر باگ فرانت است تأیید کنید
4. bus موازی یا موجودیت Ticket برای رویداد نسازید

**اگر نشود**

هر کلاینت وب map خودش را می‌نویسد؛ drift لیست / badge / seen. باگ امروز در کلاینت سوم تکرار می‌شود.

### B8 — محیط و کشف host (P1)

**چیست**

- فرانت host بک‌اند را از hostname می‌سازد (sibling `back`)
- استثنا: `m.nipoto.org` → `b.nipoto.org`؛ `ABR_URL` فقط localhost
- flavorهایی مثل `b5` و `s4` از subdomain حدس زده می‌شوند
- origin ویجت / CDN با hostname میزبان یکی نیست

**پیشنهاد**

1. جدول رسمی نسخه‌دار: flavor × user-front × staff-front × widget / CDN × back (REST و WS)، شامل معادل `m` / `b`
2. تعهد به پایدار بودن این نام‌ها
3. endpoint کشف اختیاری است؛ جدول تأییدشده کافی است
4. سیستم config پیچیده نسازید

**اگر نشود**

فرانت جدول را در SDK کپی می‌کند؛ هر embed origin را حدس می‌زند. هر محیط جدید در چند ریپو تکرار می‌شود — بحرانی پروتکل نیست؛ بحرانی عملیاتی هست.

## ۵. فرانت بدون تغییر بک‌اند چه می‌تواند بکند

این‌ها به تأیید این سند وابسته نیست:

- جداسازی SPA و استخراج `@nipoto/support-sdk` که `$app` را wrap می‌کند
- نازک کردن Vuex
- یکدست کردن نام رویداد **داخل** کلاینت وب
- توکن تزریقی در وب از روی همان کوکی
- `backUrl` صریح در SDK، با default از hostname برای embed فعلی
- ادامهٔ آپلود base64 روی REST موجود
- ادامهٔ `Notification` مرورگر
- ادامهٔ فیلتر `filter.staff` در UI
- واکنش‌گرا کردن کنسول staff برای مرورگر موبایل

## ۶. ماتریس مسدودیت

| هدف | بدون کدام | نتیجه |
| --- | --- | --- |
| embed چندکلاینته روی همان دامنه | B1، B2 | حدس پروتکل + auth شکننده |
| پنل کامل کارشناس روی مرورگر موبایل (تب پس‌زمینه) | B3، B5 | کارشناس باید تب را باز نگه دارد |
| چندکلاینته بدون نشتی Ticket دیگران | B4 | امنیت وابسته به کلاینت |
| پیوست عکس بزرگ / HEIC از Safari موبایل | B6 | فقط base64 و JPEG / PNG |
| جلوگیری از drift رویداد بین کلاینت‌های وب | B7 | هر تیم map جدا می‌نویسد |
| وصل پایدار flavorها و origin ویجت | B8 | hardcode و محیط غلط |
