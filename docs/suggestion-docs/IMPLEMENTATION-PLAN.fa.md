# پلن پیاده‌سازی — ویجت چت Nipoto

> این سند مکمل [ARCHITECTURE.fa.md](./ARCHITECTURE.fa.md) است. آن سند «چی و چرا» را می‌گوید، این سند «چطور و با چه ترتیبی».
> English version: [`IMPLEMENTATION-PLAN.en.md`](./IMPLEMENTATION-PLAN.en.md)

---

## نحوه‌ی استفاده از این سند

**برای دولوپر:** فازها را به ترتیب انجام دهید. هر فاز یک معیار پذیرش دارد؛ تا وقتی آن معیار برقرار نشده، فاز بعدی را شروع نکنید.

**برای AI:** هر فاز را به‌صورت یک واحد کاری جدا بدهید، همراه با `ARCHITECTURE.fa.md`. یک فاز کامل را انجام و تست کنید، بعد فاز بعد. **کل سند را یک‌جا به AI ندهید** — خروجی سطحی می‌شود.

قالب پیشنهادی prompt برای هر فاز:

```
فایل‌های kian/ARCHITECTURE.fa.md و kian/IMPLEMENTATION-PLAN.fa.md را بخوان.
فاز N را پیاده‌سازی کن.
بخش‌های مرتبط در ARCHITECTURE.fa.md: §X، §Y
تا وقتی معیار پذیرش فاز N برقرار نشده، به فاز بعد نرو.
```

---

## پیش‌نیازهای مسدودکننده

این‌ها را قبل از فاز مربوطه حل کنید:

| # | مورد | مسدودکننده‌ی فاز | مسئول |
|---|---|---|---|
| B1 | نام نهایی پکیج و تگ‌ها (`@nipoto/chat` / `nipoto-chat`) | فاز ۰ | تیم |
| B2 | دسترسی رجیستری برای نصب `@abr/client` در ریپوی جدید | فاز ۱ | DevOps |
| B3 | ساخت پروژه‌ی GitLab و توکن CI برای publish | فاز ۰ | DevOps |
| B4 | رنگ و برند واقعی دو بیزینس (hex، فونت) | فاز ۵ | محصول |
| B5 | محل میزبانی استاتیک عمومی برای CDN | فاز ۶ | DevOps |
| B6 | endpoint ایجاد session مهمان | فاز ۷ | بک‌اند |
| B7 | احراز هویت WebSocket از هدر handshake + پشتیبانی `@abr/client` | زمان مهاجرت به httpOnly | بک‌اند + نگهدارنده‌ی `@abr/client` |
| B8 | تصمیم مکانیزم CSRF برای آپلود فایل با کوکی | زمان مهاجرت به httpOnly | بک‌اند |

فازهای ۰ تا ۴ فقط به B1–B3 نیاز دارند. یعنی می‌شود شروع کرد.

---

## فاز ۰ — اسکلت و اثبات مکانیزم

**هدف:** ثابت کنیم `defineCustomElement` + Shadow DOM + توکن CSS واقعاً کار می‌کند، قبل از اینکه ۱۵ کامپوننت بنویسیم.

**چرا اول:** بزرگ‌ترین ناشناخته‌ی فنی همین‌جاست. اگر مشکلی هست، الان کشفش کنیم نه بعد از سه هفته.

### تسک‌ها

- [ ] ریپوی `chat-widget` با `package.json` به نام `@nipoto/chat`
- [ ] نصب: `vue@^3.5`, `vite`, `@vitejs/plugin-vue`, `typescript`
- [ ] `vite.config.ts` با `@vitejs/plugin-vue({ customElement: /\.ce\.vue$/ })`
- [ ] سه هدف build:
  - `dist/core.js` (ESM)
  - `dist/element.js` (ESM، `external: ['vue']`)
  - `dist/nipoto-chat.iife.js` (IIFE، Vue باندل‌شده)
- [ ] `src/styles/tokens.css` — **فهرست کامل توکن‌ها طبق ARCHITECTURE §۸.۱** (همه‌شان، نه فقط رنگ)
- [ ] یک کامپوننت آزمایشی `src/ui/Conversation.ce.vue` که:
  - یک کامپوننت فرزند در `ui/parts/` دارد (برای تست انتقال استایل)
  - از حداقل ۵ توکن استفاده می‌کند
  - یک `part` و یک `slot` دارد
- [ ] `src/entries/element.ts` که `customElements.define` را صدا می‌زند
- [ ] `demo/plain.html` — بدون build، فقط `<script>` و تگ
- [ ] `demo/vue/` — یک اپ Vite+Vue کوچک که ESM را import می‌کند
- [ ] `demo/react/` — یک اپ Vite+React کوچک
- [ ] `.npmrc` / `.yarnrc.yml` کپی‌شده از `nipoto-ui`
- [ ] `.gitlab-ci.yml` با job انتشار، محدود به `main`
- [ ] انتشار نسخه‌ی `0.0.1`

### معیار پذیرش

1. `demo/plain.html` را در مرورگر باز کنید — کامپوننت رندر می‌شود.
2. **استایل کامپوننت فرزند داخل shadow root دیده می‌شود.** ⚠️ این را صریح تست کنید. اگر استایل فرزند نیامد، مشکل در تنظیم `customElement` پلاگین Vue است — قبل از ادامه حلش کنید.
3. در DevTools این کار جواب می‌دهد:
   ```css
   nipoto-conversation { --chat-color-primary: lime }
   ```
   و رنگ عوض می‌شود.
4. `::part()` از بیرون استایل می‌گیرد.
5. محتوای `slot` رندر می‌شود.
6. در `demo/react/` بدون هیچ wrapper ای کار می‌کند.
7. یک CSS سراسری در صفحه‌ی میزبان (`* { border: 5px solid red }`) **داخل ویجت اثر ندارد**.

### ریسک

اگر معیار ۲ برقرار نشد، گزینه‌ها: `styles` را دستی به `defineCustomElement` بدهید، یا همه‌ی کامپوننت‌ها را `.ce.vue` کنید. **قبل از فاز ۱ باید حل شود.**

---

## فاز ۱ — لایه Core

**هدف:** کل منطق چت، بدون یک خط UI.

**چرا حالا:** UI بدون داده قابل ساخت نیست، و core بزرگ‌ترین بخش منطقی است. ضمناً کاملاً قابل تست است بدون مرورگر.

### تسک‌ها

- [ ] `src/core/types.ts` — طبق ARCHITECTURE §۵.۲ عیناً
- [ ] `src/core/store.ts` — استور خنثی:
  - `getSnapshot()`، `subscribe(fn)`، `setState(patch)`
  - **بدون `reactive` یا `ref` از Vue** (AD-3)
  - snapshot باید immutable باشد تا `useSyncExternalStore` درست کار کند
- [ ] `src/core/auth.ts` — `AuthConfig` با هر سه حالت (`cookie` / `bearer` / `guest`) طبق ARCHITECTURE §۵.۷
  - فعلاً `bearer` و `cookie` پیاده شود؛ `guest` در فاز ۷
  - ⚠️ **هرگز `token: string` نگیرید** — حتی موقتی. این همان چیزی است که روز httpOnly می‌شکند
- [ ] `src/core/session.ts` — فعلاً فقط شاخه‌ی `authenticated`
- [ ] `src/core/transport/abr.ts` — wrapper روی `@abr/client`
- [ ] `src/core/transport/rest.ts` — آپلود فایل با `fetch` (نه axios)
- [ ] `src/core/client.ts` — `createChatClient` با همه‌ی دستورات §۵.۴
- [ ] `src/core/logic/grouping.ts`
- [ ] `src/core/logic/scroll.ts`
- [ ] `src/core/logic/composer.ts`
- [ ] `src/core/logic/upload.ts`
- [ ] `src/core/format.ts` — تاریخ شمسی با `Intl`، **بدون کتابخانه**
- [ ] `src/core/i18n.ts` — دیکشنری ساده، **بدون `vue-i18n`**
- [ ] تست واحد برای `logic/*` و `store`

### مرجع کد فعلی

منطق را از این فایل‌ها بردارید — اما **عیناً کپی نکنید، بازنویسی کنید**:

| مقصد | مرجع |
|---|---|
| دستورات و کوئری‌ها | `staff/src/modules/panel/sections/support/tickets/store/actions.js` |
| رویدادهای سوکت | `support/src/component/ChatBox/ChatLayout.vue` (بخش `emitter.on`) |
| آپلود فایل | همان `actions.js`، تابع `uploadFile` |

⚠️ **باگ‌هایی که در بازنویسی باید فیکس شوند:**

1. **ناهماهنگی count و list:** در `user-panel` منطق `status === 'opened' → ['opened','reopened']` داخل `createTicketFilterQuery` نیست. در core این منطق باید **یک‌جا** باشد و هم برای list هم count استفاده شود.
2. **نام کوکی:** `user-token` / `staff-token` سخت‌کد نشود. پکیج اصلاً نام کوکی را نمی‌داند — میزبان `auth: { kind: 'bearer', getToken }` می‌دهد و خودش کوکی را می‌خواند.
3. **صفحه‌بندی پیام:** `limit: 10000` فعلی جایگزین `loadMessages({ before, limit })` واقعی شود.

### معیار پذیرش

1. یک اسکریپت Node یا صفحه‌ی HTML خالی که فقط core را استفاده می‌کند: وصل می‌شود، مکالمه می‌گیرد، پیام می‌فرستد، پیام لحظه‌ای می‌گیرد — **بدون هیچ کامپوننتی**.
2. `grep -r "from 'vue'" src/core/` هیچ نتیجه‌ای ندارد.
3. تست‌های واحد `logic/*` سبز است.
4. ارسال خوش‌بینانه کار می‌کند: پیام با `pending: true` فوراً در state ظاهر می‌شود و بعد تأیید یا `failed` می‌شود.
5. `grep -rn "Cookies\|document.cookie" src/core/` هیچ نتیجه‌ای ندارد — پکیج هرگز خودش کوکی نمی‌خواند.
6. با `auth: { kind: 'cookie' }` هیچ توکنی به کد پاس داده نمی‌شود و آپلود فایل با `credentials: 'include'` انجام می‌شود.

---

## فاز ۲ — کامپوننت‌های مکالمه و المان

**هدف:** `<nipoto-conversation>` قابل استفاده.

### تسک‌ها

- [ ] `src/ui/composables/useChatState.ts` — پل core به Vue با `shallowRef` + `subscribe`
- [ ] `src/ui/parts/MessageBubble.vue` (حالت‌های sent / received / تصویر / فایل)
- [ ] `src/ui/parts/SystemMessage.vue`
- [ ] `src/ui/parts/TypingIndicator.vue`
- [ ] `src/ui/parts/MessageList.vue` (گروه‌بندی از `logic/grouping`، اسکرول از `logic/scroll`)
- [ ] `src/ui/parts/Composer.vue` + `AttachmentPicker.vue`
- [ ] `src/ui/Conversation.ce.vue` — ریشه
- [ ] پیاده‌سازی متدها: `insertText`, `focusComposer`, `scrollToBottom`, `reload`
- [ ] انتشار همه‌ی رویدادهای §۷.۱ (شامل `nipoto-chat:auth-expired`)
- [ ] مدیریت واکنشی انقضا: روی ۴۰۱ یا خطای احراز هویت سوکت، یک بار refresh و اتصال مجدد؛ اگر شکست خورد `auth-expired` و توقف — پکیج هرگز خودش redirect نمی‌کند
- [ ] `part` روی **همه‌ی** المان‌های فهرست §۶.۳
- [ ] `slot` های `header`, `header-actions`, `empty-state`, `footer`, `message-actions`
- [ ] پشتیبانی `capabilities` (§۹)
- [ ] `stopPropagation` روی `keydown` داخل composer (L3)
- [ ] پشتیبانی RTL و `dir`
- [ ] حالت‌های loading / empty / error
- [ ] `kian/PUBLIC-API.md` — همزمان با کد نوشته شود، نه بعداً

### قواعد سخت این فاز

- ❌ هیچ `q-*` ای
- ❌ هیچ `provide` سراسری — props/emits صریح
- ❌ هیچ منطقی که جایش در `core/logic` است
- ❌ هیچ رنگ hex هاردکد — همه از توکن
- ✅ هر المان معنادار `part` دارد
- ❌ توکن به‌عنوان attribute گرفته نمی‌شود — فقط property `auth` یا `client` (AD-8)

### معیار پذیرش

1. در `demo/plain.html` یک مکالمه‌ی واقعی کار می‌کند: پیام می‌آید، می‌رود، فایل آپلود می‌شود.
2. `el.insertText('سلام')` متن را در باکس می‌گذارد.
3. با `capabilities={ canUploadFile: false }` دکمه‌ی پیوست ناپدید می‌شود.
4. `grep -rn "#[0-9a-fA-F]\{3,6\}" src/ui/` فقط داخل `tokens.css` نتیجه دارد.
5. تایپ `/` داخل باکس چت، هندلر سراسری صفحه‌ی میزبان را فعال نمی‌کند.

---

## فاز ۳ — مهاجرت staff

**هدف:** اولین مصرف‌کننده‌ی واقعی.

**چرا staff اول:** نسخه‌ی کد staff فیکس‌شده‌تر از user-panel است (route درست، department با `computed`). اول جایی برویم که مرجع درست‌تری داریم.

### تسک‌ها

- [ ] افزودن `@nipoto/chat` به `staff/package.json`
- [ ] تنظیم `isCustomElement` در `staff/quasar.config.js` (L10)
- [ ] ساخت یک `ChatClient` مشترک در boot اپ با `auth: { kind: 'bearer', getToken: () => Cookies.get('staff-token') }`
- [ ] وصل کردن `nipoto-chat:auth-expired` به فلوی لاگین staff
- [ ] در `TicketLayout.vue`: `ChatComponent.vue` با این ترکیب جایگزین شود:
  - هدر تیکت (تاریخ، عنوان، دپارتمان، دکمه‌ها) → **کامپوننت جدید در staff می‌ماند**
  - ناحیه‌ی مکالمه → `<nipoto-conversation>`
- [ ] `PredeterminedAnswers.vue` به `insertText` وصل شود
- [ ] `ConveyChat.vue` و `ProfileUser.vue` **بدون تغییر** کنار مکالمه بمانند
- [ ] `capabilities` از روی نقش‌های staff محاسبه شود
- [ ] رویداد `nipoto-chat:notify` به `src/utils/notify.js` وصل شود
- [ ] حذف: `tickets/chat/ChatMessagesList.vue`, `InputBox.vue`, `messages/*`
- [ ] حذف بخش‌های پیام‌محور از `tickets/store/*` (لیست تیکت‌ها باقی می‌ماند)

### معیار پذیرش

1. ورک‌اسپیس تیکت staff با پکیج کار می‌کند: پیام، فایل، بستن، انتقال.
2. پاسخ آماده در باکس درج می‌شود.
3. فایل‌های بالا حذف شده‌اند.
4. لیست تیکت‌ها، فیلترها و `ConveyChat` **دست‌نخورده** کار می‌کنند.
5. ظاهر با بقیه‌ی پنل staff هماهنگ است (توکن‌ها از `nipoto-ui` ارث می‌رسند).

---

## فاز ۴ — مهاجرت user-panel

**هدف:** مصرف‌کننده‌ی دوم؛ اینجاست که کپی‌پیست رسماً می‌میرد.

### تسک‌ها

- [ ] همان مراحل فاز ۳ برای `user-panel`
- [ ] `capabilities` محدودتر (بدون convey، بدون پاسخ آماده)
- [ ] همان `auth: { kind: 'bearer', getToken }` با کوکی `user-token`
- [ ] ⚠️ **مشکل route را حل کنید:** یکی از `TicketList` / `TicketsList` غلط است. مشخص کنید کدام درست است و اصلاح کنید.
- [ ] ⚠️ **باگ نام دپارتمان** در `ChatComponent.vue` — با نسخه‌ی `computed` رفع شود
- [ ] حذف: `tickets/chat/` (کل پوشه به‌جز چیزهایی که هدر لازم دارد)
- [ ] حذف `src/store/modules/support` خالی و اسکریپت `copy-support-store.js`
- [ ] حذف `invoke-chat` از `package.json`

### معیار پذیرش

1. صفحه‌ی تیکت user-panel با پکیج کار می‌کند.
2. `diff` بین ناحیه‌ی مکالمه‌ی دو اپ امکان‌پذیر نیست — چون کدی برای diff کردن نمانده. ✅
3. باگ ناهماهنگی count و list دیگر وجود ندارد.
4. هیچ ارجاعی به `@nipoto/quasar-app-extension-chat` در هیچ‌کدام از دو اپ نمانده.

---

## فاز ۵ — سیستم تم و tenant

**هدف:** دو بیزینس با رنگ خودشان.

**پیش‌نیاز:** B4 (رنگ‌های واقعی)

### تسک‌ها

- [ ] `src/core/theme.ts`:
  - `resolveTheme(defaults, preset, tenantConfig, attrTheme)`
  - تزریق به‌صورت `<style>` با قاعده‌ی `:host { }` در shadow root
  - ⚠️ **نه** با `element.style.setProperty()` — inline style ترتیب اولویت §۸.۲ را می‌شکند
- [ ] بارگذاری کانفیگ tenant:
  - `config-url` یا پیش‌فرض `${cdnBase}/tenants/${tenant}.json`
  - timeout سه ثانیه، fallback به preset داخل باندل
  - کش در `sessionStorage`
  - کلید ناشناخته نادیده گرفته شود، خطا ندهد
- [ ] `src/tenants/default.json`, `business-a.json`, `business-b.json`
- [ ] override متن‌ها از کانفیگ
- [ ] `demo/theming.html` — دو ویجت با دو tenant، کنار هم روی یک صفحه

### معیار پذیرش

1. دو `<nipoto-chat>` با `tenant` متفاوت روی یک صفحه، **همزمان با دو رنگ‌بندی متفاوت** رندر می‌شوند.
2. تغییر یک hex در فایل JSON و رفرش → رنگ عوض می‌شود، **بدون rebuild**.
3. با قطع اینترنت به CDN، ویجت با preset داخلی رندر می‌شود.
4. CSS میزبان بر کانفیگ tenant غلبه می‌کند:
   ```css
   nipoto-chat { --chat-color-primary: lime }
   ```
5. کلید ناشناخته در JSON خطا نمی‌دهد.

---

## فاز ۶ — ویجت شناور

**هدف:** `<nipoto-chat>` کامل — بزرگ‌ترین فاز.

**پیش‌نیاز:** B5 (CDN)

### تسک‌ها

- [ ] `Launcher.vue` — دکمه‌ی شناور + badge + جای‌گیری
- [ ] `WidgetHeader.vue`
- [ ] `StartForm.vue` — انتخاب دپارتمان و عنوان
- [ ] `QueueStatus.vue`
- [ ] `FaqList.vue`
- [ ] `ChatWidget.ce.vue` — ریشه، مدیریت state نمایش
- [ ] متدهای `open()`, `close()`, `toggle()`
- [ ] واکنش‌گرایی موبایل (تمام‌صفحه در موبایل)
- [ ] مدیریت focus هنگام باز و بسته شدن
- [ ] پشتیبانی کیبورد (Escape برای بستن، Tab trap)
- [ ] ⚠️ **در user-panel: یک `ChatClient` مشترک بین ویجت شناور و صفحه‌ی تیکت.** اگر هر کدام client خودش را بسازد، دو سوکت باز می‌شود و شمارنده‌ها واگرا می‌شوند.
- [ ] `kian/EMBEDDING.md` — برای مخاطب غیرفنی و غیر‌Nipoto
- [ ] انتشار روی CDN با ساختار نسخه‌بندی §۱۱.۳

### چه چیزی از `ChatLayout.vue` قدیمی منتقل **نمی‌شود**

- ❌ ۴۰ عدد `provide`
- ❌ `q-layout` / `q-drawer` / `q-fab`
- ❌ `resolveBackHost` و حدس hostname
- ❌ ماژول Vuex تزریقی
- ❌ prop به نام `side`
- ⚠️ virtualization: **فعلاً نه.** اول اندازه بگیرید. اگر مکالمه‌ها معمولاً زیر ۲۰۰ پیام‌اند، لازم نیست.

### معیار پذیرش

1. در `demo/plain.html` ویجت کامل کار می‌کند: باز، شروع مکالمه، پیام، صف، FAQ، بستن.
2. روی موبایل تمام‌صفحه و قابل استفاده است.
3. در user-panel ویجت و صفحه‌ی تیکت **یک اتصال سوکت** دارند (در DevTools → Network → WS تأیید کنید).
4. badge خوانده‌نشده بین ویجت و صفحه‌ی تیکت یکسان است.
5. حجم `nipoto-chat.iife.js` زیر ۱۵۰KB gzip.

---

## فاز ۷ — حالت ناشناس

**هدف:** استفاده روی سایت مشتری خارجی.

**پیش‌نیاز:** B6 (endpoint بک‌اند)

### تسک‌ها

- [ ] شاخه‌ی `anonymous` در `session.ts`
- [ ] تولید و ذخیره‌ی `visitorId` با کلید `nipoto-chat:{tenant}:visitor`
- [ ] تبادل با بک‌اند برای guest token
- [ ] ⚠️ **guest token فقط در حافظه** — هرگز در `localStorage` یا `sessionStorage` نوشته نشود. فقط `visitorId` ماندگار است
- [ ] fallback درون‌حافظه‌ای وقتی `localStorage` در دسترس نیست
- [ ] `LoginForm` سبک (نام / ایمیل یا موبایل) — کوتاه، به‌خاطر L9
- [ ] مدیریت انقضای token و اتصال مجدد
- [ ] تست روی یک نصب واقعی وردپرس

### معیار پذیرش

1. بازدیدکننده‌ی ناشناس روی یک صفحه‌ی HTML خام مکالمه شروع می‌کند.
2. بعد از رفرش، همان مکالمه ادامه پیدا می‌کند.
3. در حالت خصوصی مرورگر ویجت crash نمی‌کند (session درون‌حافظه‌ای).
4. دو tenant روی یک دامنه، visitor مستقل دارند.
5. روی یک وردپرس واقعی نصب و تست شده.

---

## فاز ۸ب — مهاجرت به کوکی httpOnly

**زمان‌بندی:** مستقل از فازهای دیگر. هر وقت بک‌اند آماده شد اجرا می‌شود؛ به فاز خاصی گره نخورده.

**پیش‌نیاز:** B7، B8

اگر AD-8 و §۵.۷ از ابتدا رعایت شده باشند، این فاز بسیار کوچک است.

### تسک‌ها — سمت پکیج

- [ ] پشتیبانی `csrf: () => string` در `createChatClient`
- [ ] اطمینان از اینکه همه‌ی درخواست‌های REST در حالت `cookie` با `credentials: 'include'` می‌روند
- [ ] تست مسیر انقضا: ۴۰۱ → refresh → اتصال مجدد → در صورت شکست `auth-expired`

### تسک‌ها — سمت اپ میزبان

فقط یک خط در هر اپ:

```diff
- auth: { kind: 'bearer', getToken: () => Cookies.get('staff-token') }
+ auth: { kind: 'cookie' }
```

### معیار پذیرش

1. در staff و user-panel چت کار می‌کند در حالی که `document.cookie` توکن را نشان نمی‌دهد.
2. سوکت از هدر handshake احراز هویت می‌شود، نه با پیام بعد از اتصال.
3. آپلود فایل با `credentials: 'include'` و بدون هدر `authorization` کار می‌کند.
4. با باطل کردن session سمت سرور، ویجت `nipoto-chat:auth-expired` می‌دهد و میزبان به لاگین هدایت می‌کند.
5. ⚠️ ویجت روی سایت خارجی **همچنان** با `guest` کار می‌کند و به کوکی وابسته نیست (L11).

---

## فاز ۸ — بازنشستگی

### تسک‌ها

- [ ] حذف `@nipoto/quasar-app-extension-chat` از `package.json` هر دو اپ
- [ ] حذف `support` از `workspaces` در هر دو اپ
- [ ] حذف مرحله‌ی clone کردن `support` از `base/Dockerfile`
- [ ] آرشیو ریپوی `support`
- [ ] `README.md` نهایی با لینک به هر سه سند

### معیار پذیرش

1. `grep -rn "quasar-app-extension-chat"` در کل workspace خالی است.
2. build هر دو اپ در CI بدون sibling clone کردن `support` سبز است.

---

## چک‌لیست قبل از اولین انتشار خارجی

بعد از این نقطه، API قفل می‌شود (L2). قبل از دادن لینک به اولین مشتری:

- [ ] `kian/PUBLIC-API.md` کامل و بازبینی‌شده
- [ ] همه‌ی `part` های §۶.۳ موجودند — **حتی آن‌هایی که امروز کسی نمی‌خواهد**
- [ ] همه‌ی `slot` های §۶.۳ موجودند
- [ ] فهرست کامل توکن‌های §۸.۱ پیاده شده
- [ ] همه‌ی رویدادهای §۷ منتشر می‌شوند
- [ ] CDN نسخه‌بندی‌شده (`/v1/`) است، نه بدون نسخه
- [ ] `EMBEDDING.md` توسط کسی خارج از تیم خوانده و فهمیده شده
- [ ] تست در Chrome، Firefox، Safari و Safari موبایل
- [ ] تست روی یک وردپرس با یک تم شلوغ (تداخل CSS)
- [ ] تست دسترس‌پذیری: پیمایش فقط با کیبورد، screen reader

---

## نکات همیشگی

**در هر فاز:**

- کد داخل `core/` هرگز `import` از `vue` ندارد
- پکیج هرگز خودش کوکی نمی‌خواند و هرگز `token: string` نمی‌گیرد — فقط `AuthConfig`
- هیچ رنگی خارج از `tokens.css` هاردکد نمی‌شود
- هیچ `part` یا `slot` ای بعد از انتشار حذف یا تغییر نام داده نمی‌شود
- هر attribute جدید مقدار پیش‌فرضی دارد که رفتار قبلی را حفظ کند
- `PUBLIC-API.md` همزمان با کد به‌روز می‌شود، نه در انتها

**ترتیب اولویت اگر وقت کم آمد:**

فازهای ۰ تا ۴ ارزش اصلی را می‌دهند (پایان کپی‌پیست، کد تمیز، مبنای مشترک). فازهای ۵ به بعد قابلیت جدید اضافه می‌کنند. اگر لازم شد، بعد از فاز ۴ می‌توان مکث کرد — سیستم در آن نقطه پایدار و کامل است.
