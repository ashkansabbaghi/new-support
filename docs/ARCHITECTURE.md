# معماری Integration پروژه Support

وضعیت تصمیم: **مبنای اجرا**. Chat و Ticket فیچر داخلی همین conversation‌اند، نه محصول جدا. قید میزبان: میزبان وب (سایت نیپوتو، WordPress، شخص ثالث) با loader + iframe / Custom Element؛ مستقل از زبان و framework میزبان.

## ۱. تصمیم اجرایی + non-goals

اپ Support یک **Standalone SPA** با origin، runtime، dependency graph، state و release مستقل است.

1. وب: Third-Party Widget — جزئیات نصب و CSP در [DELIVERY_AND_EMBED](./DELIVERY_AND_EMBED.md).
2. ارتباط فقط protocol نسخه‌دار کم‌سطح: `MessageChannel` / `postMessage` (iframe).
3. Web SDK فقط container، handshake و bridge می‌سازد؛ UI را در DOM میزبان render نمی‌کند.
4. Deep Link وب (URL ورود) فقط entry و fallback است، نه embed اصلی.

Custom Element فقط پوستهٔ اختیاری همان iframe است. UI داخل DOM یا Shadow DOM میزبان bundle نمی‌شود. مرز document / origin نزدیک‌ترین گزینهٔ عملی به ایزولاسیون UI / runtime / dependency / state / release است. Shadow DOM یا bundle مشترک این مرز را نمی‌سازد. iframe به‌تنهایی **تضمین OS-process isolation** نمی‌دهد.

### اهداف

- میزبان به Vue / Tailwind / CSS / build tool اپ Support وابسته نباشد
- عدم نشت CSS، global state، error و dependency
- deploy / rollback / canary مستقل
- یک قرارداد برای میزبان‌های وب (دسکتاپ و مرورگر موبایل)
- حفظ backend / realtime موجود تا فاز ۴+
- پوشش user و staff با authorization واقعی بک‌اند؛ کنسول staff روی مرورگر موبایل واکنش‌گرا داخل محدوده است
- مهاجرت تدریجی از extension فعلی

### خارج از scope

- طراحی backend API جدید در فاز ۰–۲
- تغییر semantics وضعیت‌های Chat / Ticket
- اپ native (iOS / Android) و SDK native — مسیر جدا
- اعتماد به role / user id / permission اعلامی host
- offline mutation queue تا idempotency بک‌اند اثبات نشده

## ۲. وضعیت فعلی repo

نسخهٔ فعلی Quasar App Extension است، نه application مستقل:

- package: `@nipoto/quasar-app-extension-chat` — entry: `src/index.js`
- `src/index.js` boot file، stylesheet و Quasar plugin را به build میزبان تزریق می‌کند
- `register-chat.js` کامپوننت `Chat` را globally ثبت می‌کند
- `src/install.js` ماژول Vuex `support` را به store میزبان اضافه می‌کند
- script `build` در `package.json` artifact مستقلی تولید نمی‌کند
- `package.json` runtime dependencyهای source را به‌عنوان dependency مستقل تعریف نکرده است
- UI: Vue 3 Composition API داخل SFCهای عمدتاً JavaScript؛ TypeScript config با strict هست
- UI فعلی به Quasar و stylesheet میزبان وابسته‌اند (`Chat.scss`، token / selectorهای Quasar)
- state فعلی Vuex و host-owned است

coupling به میزبان:

| نوع | شواهد |
| --- | --- |
| store میزبان | `auth/getUserData`، `auth/checkRoles`، `dashboard/getStaffStatus`، `dashboard/iAmAvailable`، `dashboard/iAmUnAvailable`، `userNotification/getEmitter` |
| utility alias | `src/utils/emitter`، `notify`، `error-translator`، `format`، `i18n-validators`، `safe-html` |
| backend | `this.$app` در `actions.js` |
| auth آپلود | کوکی `user-token` / `staff-token`؛ انتخاب به `side` و fallback hostname |
| host بک‌اند | `resolveBackHost.js` → sibling `back`؛ `ABR_URL` فقط local؛ REST و WS از یک host |

در هدف، این‌ها باید داخل artifact مالکیت شوند یا پشت adapter بروند. هیچ import از source میزبان مجاز نیست.

backend و realtime که باید حفظ شوند: aggregateها و uploadهای [PRODUCT_MAP](./PRODUCT_MAP.md). subscription مستقیم `availed` / `unAvailed` روی `$app.Support.Chat`. consumer eventها در `ChatLayout.vue` و `ChatMessagesList.vue`. producer و schema کامل لایهٔ دوم در این repo نیست — همان client موجود را package کنید؛ WebSocket جدید حدس نزنید.

`ChatLayout.vue` availability listener را در unmount لغو می‌کند؛ resize و چند emitter listener همان component و listenerهای `ChatMessagesList.vue` teardown کامل ندارند. دسترسی مستقیم به `window` / `document` در همین فایل‌ها برای viewport فرض میزبان دارد. `Notification` مرورگر + `beep.js` در iframe یکسان عمل نمی‌کند و باید به host notification adapter برود.

## ۳. Chat = Ticket

aggregate مستقلی به نام `Support.Ticket` دیده نمی‌شود. thread، status، queue، assignment، FAQ و message همه از `Support.Chat` و `Support.Message` است.

- `Conversation` مدل مشترک داخلی ماژول است
- Chat و Ticket دو surface / workflow روی همان قرارداد backendاند
- ساخت endpoint یا aggregate فرضی مثل `Support.Ticket` ممنوع است

وجود route `ticket.*` در protocol به معنی API جدید نیست؛ باید روی همان `Support.Chat` map شود.

## ۴. روش‌های integration

| روش | اولویت | نقش |
| --- | --- | --- |
| B — Third-Party Widget | ۱ برای وب؛ نصب رسمی وب | SDK کوچک iframe را از origin ماژول می‌سازد؛ API مثل `open` / `close` / `setSession` |
| C — Custom Element | ۲؛ ergonomics | `<nipoto-support-module>` فقط wrapper روش B است؛ UI وارد DOM / Shadow DOM نمی‌شود |
| D — Deep Link | ۳؛ entry / fallback وب | notification click، host بدون overlay، باز کردن conversation پس از auth |

host نباید `sendMessage` / `conveyChat` را به‌جای module اجرا کند، مگر adapter موقت مهاجرت.

مسیر انتخاب‌شده: B برای وب، C اختیاری روی B، D فقط fallback وب. Module Federation و کپی store داخل host با release مستقل سازگار نیستند. App Extension فعلی فقط مبدأ مهاجرت است.

Deep Link به‌تنهایی lifecycle، unread، session refresh را حل نمی‌کند. token یا PII در URL ممنوع است.

کنترل‌های B (جزئیات CSP در DELIVERY): origin جدا؛ `targetOrigin="*"` ممنوع؛ sandbox حداقلی؛ `widget-id` عمومی است.

روش C فقط وقتی پذیرفته است که UI داخل Shadow DOM / DOM میزبان bundle نشود، Custom Element global CSS / singleton نصب نکند، و حذف element، session و subscription را dispose کند.

## ۵. پنج لایه منطقی

1. **Presentation** — route و UIهای Chat / Ticket؛ بدون دسترسی مستقیم به bridge یا `$app`
2. **Application / Domain** — use caseهای conversation، queue، message، FAQ، assignment، availability؛ مدل `Conversation` با surfaceهای `chat` و `ticket`
3. **SupportGateway** — تنها محل دسترسی به `$app.Support.*` و uploadهای فعلی؛ ترجمهٔ مدل typed داخلی ↔ payload بک‌اند. این anti-corruption لایهٔ فرانت است، نه API جدید
4. **Session / Realtime** — bootstrap credential، reconnect، subscription registry، cache reconciliation؛ همان realtime موجود
5. **Host Bridge** — protocol versioning، lifecycle، navigation، theme، locale، eventهای حداقلی

وابستگی: Presentation ← Application ← interfaceهای Gateway / Bridge. implementation بک‌اند و host در لبه. هیچ feature نباید مستقیماً `window.parent` را صدا بزند.

کش server-state فقط با TanStack Vue Query (بخش ۱۲) نگه‌داری می‌شود؛ لایهٔ Session / Realtime کش مستقل خودش را نگه نمی‌دارد، فقط با query key معین آن را invalidate / refetch می‌کند. کوئری هرگز مستقل از Gateway / Realtime داده را poll نمی‌کند.

اگر client موجود فقط cookie می‌پذیرد و credential injection ندارد، blocker فاز صفر است. راه‌حل هدف package / adapter همان client است؛ proxy دائمی همهٔ commandها از host ایزولاسیون را نقض می‌کند.

## ۶. Protocol

### envelope

همهٔ transportها یک JSON یکسان دارند:

```json
{
  "channel": "nipoto.support",
  "protocolVersion": "1.0",
  "instanceId": "01J...",
  "messageId": "01J...",
  "requestId": "01J... or null",
  "type": "HOST_INIT",
  "sentAt": "2026-08-19T05:30:00.000Z",
  "payload": {}
}
```

- schema نسخه‌دار و runtime-validated (JSON Schema + Ajv)
- `messageId` برای dedup transport است، نه idempotency بک‌اند
- response همان `requestId` را برمی‌گرداند
- field ناشناخته در minor نادیده؛ capability اجباریِ ناشناخته → `UNSUPPORTED_CAPABILITY`
- payload خام، credential و متن پیام log نشوند
- سقف اندازهٔ envelope روی bridge ۶۴ کیلوبایت است (اندازهٔ UTF-8 پیام سریالایز‌شده)؛ تخطی → `ENVELOPE_TOO_LARGE`. attachment هرگز از این مسیر عبور نمی‌کند

منبع حقیقت protocol: JSON Schema Draft 2020-12. hostها TypeScript-only نیستند.

### handshake

1. host URL بدون secret را از origin allowlisted بارگذاری می‌کند
2. module `MODULE_READY` (version، protocol range، nonce، capability) می‌فرستد
3. host origin / source / nonce را بررسی و transport اختصاصی برقرار می‌کند؛ mismatch در حد protocol major → `UNSUPPORTED_PROTOCOL` (جدا از `UNSUPPORTED_CAPABILITY` که برای یک capability ناشناخته داخل یک major سازگار است)
4. host `HOST_INIT` با config غیرحساس می‌فرستد
5. credential با `SESSION_SET` فقط روی channel تأییدشده
6. پس از bootstrap بک‌اند، `MODULE_INITIALIZED`

config: `side`، `locale`، `direction`، `theme`، `initialRoute.name`، `host.appId` / `appVersion` / `platform`. `side` فقط presentation است. `auth/checkRoles` در `ChatHome.vue` یک UI gate است.

### commandهای host → module (V1)

`HOST_INIT`، `SESSION_SET`، `SESSION_CLEAR`، `MODULE_OPEN`، `MODULE_CLOSE`، `NAVIGATE`، `LOCALE_SET`، `THEME_SET`، `HOST_FOREGROUND`، `HOST_BACKGROUND`، `NETWORK_STATUS_CHANGED`، `BACK_REQUESTED`، `DISPOSE`

host فرمان دامنه (`SEND_MESSAGE`، `CLOSE_CHAT`، `CONVEY_CHAT`) ندارد.

### eventهای module → host

`MODULE_READY`، `MODULE_INITIALIZED`، `MODULE_OPENED`، `MODULE_CLOSED`، `ROUTE_CHANGED`، `UNREAD_COUNT_CHANGED`، `CONVERSATION_STATE_CHANGED`، `EXTERNAL_NAVIGATION_REQUESTED`، `NOTIFICATION_REQUESTED`، `AUTH_REQUIRED`، `MODULE_ERROR`، `MODULE_DISPOSED`

data-minimized: مثلاً `UNREAD_COUNT_CHANGED` فقط count است، نه متن پیام. متن message، email، mobile، attachment و token از bridge عبور نکند مگر policy مصوب.

نتیجه: `COMMAND_SUCCEEDED` یا `COMMAND_FAILED` با `code`، `category`، `retryable`، `correlationId`. stack trace فقط داخل telemetry ماژول.

واژگان پایدار `code`:

| `code` | معنی |
| --- | --- |
| `INVALID_ENVELOPE` | envelope با schema نسخهٔ فعلی مطابقت ندارد یا JSON نامعتبر است |
| `ENVELOPE_TOO_LARGE` | بیش از سقف ۶۴ کیلوبایت |
| `UNSUPPORTED_PROTOCOL` | protocol major هندشیک با module ناسازگار است |
| `UNKNOWN_TYPE` | `type` پیام در schema نسخهٔ فعلی تعریف نشده |
| `UNSUPPORTED_CAPABILITY` | capability اجباری اعلام‌شده توسط طرف مقابل ناشناخته است |
| `LIFECYCLE_VIOLATION` | command برای state فعلی مجاز نیست (بخش ۸) |
| `INVALID_NONCE` | nonce هندشیک نامعتبر یا مصرف‌شده است |
| `STALE_GENERATION` | پیام مربوط به generation قدیمی session است؛ نادیده گرفته می‌شود |
| `FORBIDDEN_PAYLOAD` | کلید ممنوعه (attachment، HTML، token) در payload bridge |
| `ALREADY_DISPOSED` | command بعد از `DISPOSE` رسیده |
| `INTERNAL` | خطای داخلی غیرمنتظره |

API میزبان: `open` / `close` / `navigate` / `setSession` / `dispose`.

adapter وب پیشنهادی: `@nipoto/support-web-sdk` — iframe، origin ثابت، handshake، `MessageChannel`، API promise-based با timeout / cancel. هیچ domain client ندارد.

credential فقط پس از load و nonce handshake.

### نمونه‌های اتصال به قرارداد فعلی

باز کردن Chat کاربر: URL بدون token → `MODULE_READY` → `HOST_INIT(side=user)` → `SESSION_SET` → bootstrap `$app` → Department / availability → `Support.Chat.open({ department, title })` → `opened` یا `queued` → `sendMessage`. host فقط `CONVERSATION_STATE_CHANGED` یا `UNREAD_COUNT_CHANGED`.

realtime / recovery: adapter `NEW_MESSAGE` را روی conversation فعال اعمال می‌کند (`ChatMessagesList.vue`). اگر module در background باشد متن به host نمی‌رود؛ فقط `NOTIFICATION_REQUESTED` privacy-safe. بعد از foreground، history دوباره از `getChatMessages` reconcile می‌شود. seen با قرارداد موجود.

Ticket staff-side: `side=staff`؛ credential واقعی بودن staff را تعیین می‌کند؛ list از `getOpenChats` / `getClosedChats` / `getQueuedChats`؛ `ticket.view` همان thread؛ processing / close / convey روی `Support.Chat`. هیچ Ticket API فرضی.

logout: `SESSION_CLEAR` با generation جدید → cancel subscription و پاک کردن cache / credential → `MODULE_CLOSED(reason=session-cleared)` → event دیررس session قبلی به‌خاطر generation mismatch نادیده.

## ۷. Auth / Session

واقعیت: برای upload، token از کوکی خوانده و در `authorization` می‌رود. bootstrap / refresh اتصال `$app` در این repo تعریف نشده.

تصمیم:

1. همان credential موجود؛ token type یا endpoint جدید فرض نمی‌شود
2. credential از URL، query، fragment، `localStorage` و log عبور نمی‌کند
3. host بعد از handshake با `SESSION_SET` / `setSession` می‌فرستد؛ module فقط در memory نگه می‌دارد؛ adapter همان را به `$app` و upload می‌دهد
4. same-site cookie فقط compatibility mode است — iframe و third-party cookie (از جمله Safari موبایل) سیاست یکسان ندارند
5. refresh: host credential با generation بالاتر؛ module اتصال قبلی را قطع و دوباره bootstrap می‌کند
6. logout / account switch: `SESSION_CLEAR` → cancel subscription → پاک کردن cache / draft / object URL → state بدون session
7. `401` یا قطع auth realtime → `AUTH_REQUIRED`؛ دقیقاً یک‌بار به ازای هر generation emit می‌شود، بدون retry خودکار؛ ماژول تا `SESSION_SET` جدید با generation بالاتر از میزبان صبر می‌کند

credential وارد store / devtools نمی‌شود.

storage مجاز: locale / theme غیرحساس، آخرین release metadata، feature flag عمومی، cache غیرحساس فقط پس از threat-model مصوب. ممنوع: token در `localStorage` / `sessionStorage` / IndexedDB؛ message body و attachment در persistent cache پیش‌فرض؛ serialization کامل store؛ credential در URL؛ shared storage با host. بعد از reload، module دوباره session bootstrap و fetch می‌کند.

## ۸. Navigation + lifecycle + realtime

router داخلی مال ماژول است. host فقط routeهای semantic می‌شناسد:

`conversation.home`، `conversation.new`، `conversation.view`، `conversation.queue`، `conversation.history`، `ticket.list`، `ticket.view`

- URL داخلی implementation detail است؛ نسخهٔ اول hash history (بدون rewrite روی همهٔ CDN)
- `NAVIGATE` با route name، params validateشده و `replace` اختیاری
- شناسهٔ conversation بدون token می‌تواند در URL ورود باشد؛ resolve بعد از session و authorization
- navigation خارجی فقط با `EXTERNAL_NAVIGATION_REQUESTED`؛ host allowlist اعمال می‌کند
- back ابتدا به router ماژول؛ اگر مصرف نشد `BACK_UNHANDLED`

| حالت | معنی |
| --- | --- |
| `created` | document بارگذاری شده؛ backend هنوز وصل نیست |
| `ready` | schema و capability bridge آماده‌اند |
| `initialized` | session و backend adapter آماده‌اند |
| `foreground` | UI فعال؛ subscriptionهای لازم برقرار |
| `background` | timer و کار غیرضروری pause (مثلاً تب پنهان مرورگر موبایل) |
| `recovering` | network / session / realtime در حال بازیابی |
| `disposed` | listener، timer، object URL، query و credential آزاد |

realtime:

- subscription فقط در registry لایهٔ Realtime
- event بک‌اند → domain event typed
- بعد از reconnect یا برگشت از background، list و conversation فعال دوباره query می‌شوند؛ replay تنها منبع حقیقت نیست
- listener تکراری با `instanceId + subscription key` جلوگیری می‌شود
- mutation آفلاین queue نمی‌شود مگر idempotency بعداً تأیید شود

## ۹. Versioning و rollout

سه نسخهٔ مستقل: **module** (SemVer)، **bridge protocol** (major / minor)، **host adapter** (Web SDK).

- assetها content-hashed و immutable
- host به protocol major و release channel وصل می‌شود، نه filename متغیر
- module حداقل current و previous minor همان major را می‌پذیرد
- breaking فقط با protocol major جدید
- Web SDK قبل از حذف protocol قدیمی telemetry compatibility دارد
- capability negotiation، نه user-agent sniffing
- SSR لازم نیست. Service Worker در V1 خاموش است (stale asset / rollback پیچیده)

rollout: internal → staff canary → درصد محدود user → یک host منتخب → گسترش hostها → deprecation extension.

rollback با تغییر release manifest / CDN alias به artifact قبلی؛ rebuild host لازم نیست. manifest فقط version allowlisted و integrity؛ می‌تواند static CDN باشد — endpoint بک‌اند جدید فرض نشده.

## ۱۰. Security خلاصه

- host و module دو principal جدا؛ module به config host برای authorization اعتماد نمی‌کند
- host به URL و event ماژول بدون validation اعتماد نمی‌کند
- بک‌اند منبع حقیقت session و permission است
- credential فقط memory؛ history پیش‌فرض persist نشود؛ cache حساس در `SESSION_CLEAR` پاک شود
- پیام‌های فعلی با `v-html` و `formatSafeChatHtml` میزبان render می‌شوند (`SentMsg.vue` / `ReceivedMsg.vue`). sanitizer باید dependency مالکیت‌شدهٔ ماژول باشد؛ scheme allowlist؛ rich text ناشناخته → plain text. CSP جای sanitizer را نمی‌گیرد
- upload: type / size در client و backend؛ attachment مستقیم با endpoint موجود، نه از bridge؛ MIME برگشتی trust نشود؛ object URL در dispose revoke شود

کنترل‌های CSP / `frame-ancestors` / SRI / origin matrix در [DELIVERY_AND_EMBED](./DELIVERY_AND_EMBED.md).

## ۱۱. ADR

| ID | تصمیم | دلیل کوتاه | وضعیت |
| --- | --- | --- | --- |
| ADR-001 | اجرا در document مستقل iframe cross-origin. Custom Element فقط wrapper. bundle در Shadow DOM / DOM میزبان رد | تنها مرز سازگار با ایزولاسیون DOM / CSS / runtime / release | Accepted |
| ADR-002 | Vue 3 + TypeScript + Vite + Tailwind + shadcn-vue + Pinia + Vue Router + Vue I18n | مالکیت کد و ایزولاسیون UI داخل origin ماژول | Accepted |
| ADR-003 | `SupportGateway` typed روی همان `$app.Support.*`؛ client داخل artifact initialize شود | همهٔ command / query فعلی از همین client است | Accepted با blocker فاز صفر |
| ADR-004 | server state جدا از UI / bridge / lifecycle؛ credential در memory خصوصی `SessionManager` | list / history سرور-owned؛ drawer / locale کلاینت-owned | Accepted |
| ADR-005 | JSON Schema نسخه‌دار منبع حقیقت protocol؛ validation runtime با Ajv | hostها TypeScript-only نیستند؛ schema برای JS / hostهای وب | Accepted |
| ADR-006 | token و message history persist نشوند؛ storage فقط preference غیرحساس و cache مصوب | token حساس است؛ storage policy بین مرورگر / iframe یکسان نیست | Accepted |
| ADR-007 | read cache محدود مجاز؛ offline mutation queue ممنوع | idempotency `open` / `send` / `close` / `reopen` / `convey` در repo معلوم نیست | Accepted |
| ADR-008 | Yarn 4 workspace بدون Nx / Turborepo در شروع | repo همین حالا Yarn 4 را pin کرده | Accepted |
| ADR-009 | Hash history (`#/`) برای routing نسخهٔ اول، نه History API | بدون نیاز به rewrite روی همهٔ CDN / میزبان‌های وب | Accepted |
| ADR-010 | `widget-id` عمومی و غیر-secret؛ authorization فقط از credential بعد از handshake می‌آید | tenant / config به شناسه نیاز دارد، ولی امنیت نباید به مخفی ماندن آن متکی باشد | Accepted |

آزمون پذیرش ADR: host vanilla HTML بدون runtime اپ Support بتواند باز و dispose کند؛ هیچ import از `src/utils/*` یا store میزبان در app جدید نباشد؛ logout cache و session را پاک کند؛ reconnect command تکراری نسازد؛ fixtureهای معتبر / نامعتبر در Web SDK نتیجهٔ یکسان بدهند.

## ۱۲. Stack هدف

رسمی: **Vue 3 + TypeScript + Vite + Tailwind + shadcn-vue + Pinia + Vue Router + Vue I18n**. data / server state: TanStack Vue Query. کد فعلی هنوز Quasar + Vuex است و به همین stack مهاجرت می‌کند. دو stack رسمی وجود ندارد.

چرا shadcn-vue:

1. بزرگ‌ترین تفاوت مالکیت کد است
2. کنترل ۱۰۰٪: کامپوننت‌ها داخل پروژه کپی می‌شوند، نه وابستگی جعبه‌سیاه
3. Zero Bundle Size: فقط همان‌هایی که اضافه / کپی می‌کنید ارسال می‌شوند
4. دسترس‌پذیری از لایهٔ primitive (تاریخی Radix Vue؛ امروز ممکن است Reka UI باشد): WAI-ARIA، کیبورد، screen reader
5. جداسازی منطق از ظاهر با Tailwind؛ تم Dark / Light ساده‌تر از سایر UI kitها

Tailwind و shadcn-vue فقط داخل document ماژول‌اند. دیگر `src/index.js` config میزبان را دستکاری نمی‌کند، `register-chat.js` global روی host ثبت نمی‌کند، `Chat.scss` وارد stylesheet میزبان نمی‌شود. token معنایی مثل `--support-color-primary` مالک ماژول است. selectorهایی مثل `.q-btn` جایگزین می‌شوند. فونت و icon داخل artifact یا CDN allowlisted ماژول.

Vue I18n داخل bundle؛ baseline `src/i18n/fa-IR` و `en-US`؛ locale / direction از `HOST_INIT` با fallback مستقل. تغییر locale runtime به query / backend وابسته نیست.

a11y داخل document ماژول: keyboard / focus trap؛ focus return از طریق host bridge؛ label معنایی برای status پیام؛ contrast و RTL؛ reduced motion و announcement پیام جدید. viewport با `visualViewport` و safe-area؛ منطق فعلی `window.innerHeight` در `ChatLayout.vue` فقط baseline مهاجرت است.

environment: منطق `resolveBackHost.js` baseline است، اما host URL دلخواه backend نمی‌فرستد. module یکی از environment IDهای build / deploy allowlisted را resolve می‌کند. `ABR_URL` فقط local development.

ابزار: Yarn 4 (همین repo در `.yarnrc.yml` pin شده؛ الان 4.9.2)، TypeScript strict، `<script setup lang="ts">`، Vite، ESLint flat + vue + TS. Node: یک Active LTS واحد در local / CI. Changesets برای version packageها.

خروجی build: `index.html`، asset content-hashed، metadata غیرحساس version، source map خصوصی، manifest برای `internal` / `canary` / `stable`.

host هیچ Vue component، Vuex module، stylesheet یا backend client دریافت نمی‌کند.

## ۱۳. خط زمانی بک‌اند

| فاز | مسیر کلاینت | API جدید |
| --- | --- | --- |
| فاز ۰–۲ (V1 فرانت) | کلاینت → SupportGateway روی `$app` / ABR | ممنوع |
| فاز ۲–۳ (parity) | همان Gateway یا thin BFF روی `$app` موجود | فقط additive. پیشنهادهای B1–B8 روی ABR |
| فاز ۴+ (هدف محصول) | کلاینت → REST/OpenAPI سرویس NestJS مستقل. ABR پشت API | قرارداد رسمی |

جزئیات B1–B8 در [BACKEND_REQUIREMENTS](./BACKEND_REQUIREMENTS.md).

## ۱۴. معیار پذیرش + ریسک‌ها + سؤالات باز

### معیار پذیرش

- host نمونه بدون runtime اپ Support بتواند app را باز کند
- حذف module هیچ global / listener / style در host نگذارد
- دو نسخهٔ host adapter با یک protocol major وصل شوند
- credential در URL / storage / log دیده نشود
- قطع و وصل شبکه duplicate message / subscription نسازد
- rollback module بدون release جدید host
- همهٔ featureهای scope فقط به قرارداد بک‌اند موجود (یا در فاز ۴+ به OpenAPI رسمی) map شوند
- contract test command / event خارج از schema را رد کند

### Assumptionها

- aggregateهای `actions.js` در زمان مهاجرت در دسترس می‌مانند
- origin اول‌شخص HTTPS برای module قابل provision است
- credential فعلی به‌شکلی در iframe / `SESSION_SET` قابل استفاده است؛ شکل دقیق فاز صفر اثبات می‌شود
- تا evidence خلاف، Ticket projection روی `Support.Chat` / `Message` است
- host حداقل load URL، exchange message و lifecycle را پیاده می‌کند
- دانش Composition API فعلی برای مهاجرت قابل reuse است
- client سازندهٔ `$app` را می‌توان داخل artifact package یا wrap کرد

### ریسک‌ها

- `$app` ممکن است package مستقل یا API تزریق credential نداشته باشد
- cookie و third-party storage بین مرورگرها / iframe فرق دارد (به‌ویژه Safari موبایل)
- بک‌اند ممکن است origin جدید را برای HTTP / WebSocket نپذیرد
- staff و user در یک artifact اگر feature gating ضعیف باشد سطح حمله را بالا می‌برد
- هم‌زمانی extension قدیم و module جدید می‌تواند subscription / notification تکراری بسازد
- اگر کپی بیش از حد UI از startup / memory budget مرورگر موبایل عبور کرد باید اندازه‌گیری شود
- `Notification` فعلی + `beep.js` در iframe یکسان نیست و باید به host notification adapter برود
- eventهای فعلی teardown یکدست ندارند؛ registry جدید لازم است

### سؤالات باز معماری

1. scope نهایی Ticket فقط presentation روی Chat است یا قرارداد بک‌اند دیگری خارج از این repo هست؟
2. آیا client ABR credential را programmatically می‌پذیرد یا فقط cookie jar را می‌خواند؟
3. حداقل نسخهٔ مرورگرهای هدف (Chrome / Firefox / Safari دسکتاپ و موبایل) و hostهای rollout اول کدام‌اند؟
4. sink observability، policy PII و data residency چیست؟
5. چند instance هم‌زمان برای یک account مجاز است یا single-active-instance؟
6. بعضی hostها artifact pinned می‌خواهند یا channel خودکار کافی است؟
7. limit / MIME قطعی avatar و attachment و وجود malware scanning چیست؟
8. budget startup / memory / compressed bundle و canary اول (کدام host / side) چیست؟
