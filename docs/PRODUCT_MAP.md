# نقشه محصول Chat و Ticket

## ۱. خلاصه اجرایی

ریپوی `support` محصول کامل پشتیبانی نیست؛ Quasar App Extension / ویجت چت است که داخل میزبان embed می‌شود. ریپوی `staff` کنسول عملیاتی است: فهرست و جزئیات Ticket، FAQ، Department، Predetermined، availability.

`staff` فقط مصرف‌کنندهٔ ویجت نیست: هم `<Chat side="staff" />` را در layout می‌گذارد، هم route و Vuex اختصاصی دارد.

- `support` = ویجت مشترک + store/action دامنهٔ Chat
- `staff` = کنسول عملیاتی Ticket / Chat برای کارکنان
- Ticket = همان `Support.Chat`؛ موجودیت یا API جدا نیست

ماژول‌های دیگر `staff` (verification، accounting، market-management، p2p، marketing و مشابه) خارج از scope این نقشه است. مستندی که فقط `support` را «محصول پشتیبانی» بنامد تصویر ownership را ناقص می‌کند.

## ۲. مرز support / staff

### `support`

Package: `@nipoto/quasar-app-extension-chat`

- ثبت سراسری `Chat`: `src/index.js`، `src/boot/register-chat.js`
- تزریق Vuex module `support`: `src/install.js`
- UI ویجت: `src/component/ChatBox/*`
- actionهای دامنه: `src/install/src/store/modules/support/actions.js`

قابلیت‌ها: لانچر شناور، شروع گفتگو و Department، FAQ پیش از Chat، queue و first message، live chat، لیست active / queued / closed، close / process / convey / Predetermined داخل ویجت، آپلود avatar و attachment.

### `staff`

Section `/support`: `src/modules/panel/sections/support/routes.js`

- فهرست و جزئیات Ticket: `src/modules/panel/sections/support/tickets/*`
- FAQ: `src/modules/panel/sections/faq/*`
- Department: `src/modules/panel/sections/department/*`
- Predetermined: `src/modules/panel/sections/support/PredeterminedAnswers.vue`
- availability: `src/modules/panel/sections/support/components/staffList.vue`

نقش‌ها: `supporter`، `technicalManager`، `supportManager`. کنسول staff روی مرورگر موبایل (واکنش‌گرا) داخل محدوده است؛ اپ native نیست.

routeهای standalone در `department/routes.js` و `faq/routes.js` کامنت شده‌اند؛ مسیر واقعی داخل `support/routes.js` است.

وابستگی:

- `staff/package.json` → `@nipoto/quasar-app-extension-chat: "workspace:*"`
- `quasar.extensions.json` افزونهٔ `@nipoto/chat` را فعال می‌کند
- i18n فارسی: `import chat from '@nipoto/quasar-app-extension-chat/src/i18n/fa-IR'`
- `PanelLayout.vue`: `<Chat v-if="isUserLoggedIn" side="staff" />`

## ۳. فیچرهای staff

| فیچر | Route | Aggregate | رفتار |
| --- | --- | --- | --- |
| پوستهٔ Support | `/support` | — | mount برای `supporter` / `technicalManager` / `supportManager` |
| فهرست Ticket | `/tickets/list` | `$app.Support.Chat.lists.chat` | فیلتر title / status / staff / department / `updatedAt`؛ pagination و count سمت سرور |
| جزئیات Ticket | `/tickets/view/:id` | `Chat` + `Message` | timeline پیام + پروفایل کاربر؛ close از همین صفحه؛ comment جدا از thread پیدا نشد |
| Convey | از لیست | `$app.Support.Chat(id).convey(data)` | عوض کردن staff / department؛ `forceAssigning`؛ Ticket با `status === 'closed'` convey نمی‌شود |
| Predetermined | `/predetermined-answer` | `$app.Support.Predetermined` | CRUD + دسته؛ مجوز `supporter` / `supportManager`؛ ویجت همان دامنه را مصرف می‌کند |
| Department | `/departments` | `$app.Support.Department` | CRUD؛ مجوز `technicalManager` / `supportManager`؛ شروع Chat و فیلتر FAQ |
| FAQ | `/faqs` | `$app.Support.FAQ` | CRUD، فیلتر Department، tag؛ مجوز `technicalManager` / `supportManager` |
| Availability | `/staffs-list` | `$app.Support.Chat` `avail` / `unAvail` | فهرست staff و وضعیت؛ مجوز `supportManager`؛ dashboard هم همان command را دارد |
| Embed ویجت | `PanelLayout.vue` | ویجت `support` | `<Chat v-if="isUserLoggedIn" side="staff" />` |

جزئیات فهرست: اگر کاربر `supportManager` نباشد، `TicketsList.vue` مقدار `filter.staff` را روی شناسهٔ خودش می‌گذارد. `technicalManager` اینجا مدیر لیست حساب نمی‌شود. `supportManager` می‌تواند `staff` را خالی بگذارد.

وضعیت‌های UI: `queued`، `processing`، `opened`، `reopened`، `staff replied`، `user replied`، `conveyed`، `requeued`، `closed`.

جزئیات Ticket (`TicketLayout.vue`، `chat/ChatComponent.vue`، `ChatMessagesList.vue`، `InputBox.vue`، `ProfileUser.vue`): `tickets/getChat` با `route.params.id`؛ پیام‌ها از `tickets/getChatMessages` با separator تاریخ و optimistic update و attachment؛ ارسال از `tickets/sendMessage` / `uploadFile` / `sendFile`؛ `ProfileUser.vue` وضعیت، `chatID`، آخرین بروزرسانی و لینک `UserDetails`. هستهٔ صفحه همان thread است؛ comment جدا پیدا نشد.

Convey (`tickets/ConveyChat.vue`، `support/store/actions.js`): انتخاب staff از `supportCenter/getStaffList`؛ action نهایی `supportCenter/conveyChat`.

Predetermined: list / count / create / edit / delete + `getPredeterminedCategory`. FAQ: list / count / get / add / edit / remove + فیلتر Department + `getTags()`. Department: list / count / add / edit / remove (`DepartmentIndex.vue`، `AddDepartment.vue`، `DepartmentList.vue`). Availability: `staffList.vue` + `support/store/actions.js` + `dashboard/store/actions.js`.

شواهد route: `support/routes.js`، `tickets/routes.js`. store فهرست: `tickets/store/actions.js`، `tickets/store/index.js`. FAQ: `FAQIndex.vue`، `AddFAQ.vue`، `FAQList.vue`، `faq/store/actions.js`. Department: `department/store/actions.js`.

## ۴. widget سمت کاربر

ماهیت فنی: `Chat` را globally register می‌کند، store module `support` را inject می‌کند، و روی هر دو `side` کار می‌کند. در `ChatHome.vue` اگر `side === 'staff'` باشد قبل از mount نقش `supporter` چک می‌شود — این UI gate است، نه مجوز بک‌اند.

| قابلیت | مسیر نمونه |
| --- | --- |
| پوسته | `ChatHome.vue`، `ChatLayout.vue` |
| شروع / FAQ / صف / پیام | `StartConv.vue`، `FAQ/FAQList.vue`، `queue/ChatQueue.vue`، `ChatMessagesList.vue`، `InputBox.vue` |
| convey / Predetermined | `partials/ConveyChat.vue`، `partials/PredeterminedAnswers.vue` |
| فیلتر self / other | `ChatLayout.vue`، `partials/ChatList.vue` |
| نصب روی میزبان | `src/index.js`، `src/install.js`، `src/boot/register-chat.js` |
| تقریباً همهٔ command/query | `src/install/src/store/modules/support/actions.js` |
| توکن آپلود | `authToken.js` — کوکی `user-token` / `staff-token` |
| حدس host بک‌اند | `resolveBackHost.js` |

قابلیت‌های واقعی ویجت:

- شروع Chat و انتخاب Department؛ FAQ قبل از ساخت Chat
- queue و first message؛ live conversation
- لیست active / queued / closed؛ باز / بسته / بازگشایی
- attachment؛ process؛ convey؛ Predetermined
- listener حضور؛ badge تعداد Chat باز در حالت staff

فایل‌های بیشتر: `partials/ChatStatus.vue`، `partials/ChangeStatus.vue`.

actionهای دامنه در همان store: Department، open / close / reOpen، لیست‌ها، history، FAQ، user data، available staff، avatar / file upload، process / convey، Predetermined. همچنان به `$app` و میزبان وابسته‌اند. همین لایه است که ویجت را reusable می‌کند.

وابستگی میزبان که در هدف مستقل باید حذف یا پشت adapter برود: `auth/*`، `dashboard/*`، `userNotification/getEmitter`، `src/utils/*` میزبان (`emitter`، `notify`، `error-translator`، `format`، `i18n-validators`، `safe-html`).

صفحات Ticket / FAQ / Department / availability **اینجا نیستند**؛ در `staff`اند.

## ۵. جریان‌های E2E

### ۱) کاربر Chat را شروع می‌کند

1. ویجت Department را از `$app.Support.Department.lists.department` و FAQ را از `$app.Support.FAQ` می‌گیرد؛ availability از `Support.Chat.lists.staff.isThereOnline()`.
2. کاربر عنوان و Department می‌فرستد → `Support.Chat.open({ department, title })`.
3. نتیجه `opened` یا `queued` state مناسب را فعال می‌کند.
4. متن با `Support.Chat(chat).sendMessage({ text })`؛ فایل با upload REST سپس `sendFile`.
5. seen با `Support.Message.seen({ chatID, messagesID })`.
6. history از `Support.Message.lists.message.getChatMessages(...)`.

### ۲) کارشناس از کنسول جواب می‌دهد

1. `staff` افزونهٔ `@nipoto/chat` را به‌صورت workspace dependency نصب می‌کند؛ extension `Chat` را globally ثبت می‌کند.
2. `PanelLayout.vue` ویجت را با `side="staff"` می‌گذارد (علاوه بر صفحه‌های `/support`).
3. `/tickets/list` → `$app.Support.Chat.lists.chat` با `where` بخش ۷.
4. غیرمدیر در UI فیلتر `staff` را روی خودش می‌گذارد و همان شرط به سرور می‌رود.
5. `/tickets/view/:id` همان thread را با `tickets/getChat` نشان می‌دهد — Ticket detail یعنی همان Chat-centric view.
6. پیام، فایل، close (`tickets/closeChat`)، convey، profile lookup → دوباره `Support.Chat` / `Support.Message`. processing / close / convey در ویجت به `Support.Chat(...).processing` / `close` / `convey` می‌رسد.

### ۳) مدیریت محتوا

1. managerها FAQ و Department را در `staff` می‌سازند / ویرایش می‌کنند (`Support.FAQ` / `Support.Department`).
2. Predetermined در `/predetermined-answer` مدیریت می‌شود (`Support.Predetermined`).
3. ویجت هنگام شروع Chat همان Department و FAQ را می‌خواند؛ dialog انتخاب Predetermined همان دامنه را مصرف می‌کند.
4. Department فقط metadata نیست؛ شروع Chat و فیلتر FAQ به آن وابسته‌اند.

### ۴) حضور و صف

1. dashboard / `/staffs-list` می‌توانند `avail()` و `unAvail()` را روی `$app.Support.Chat` صدا بزنند.
2. ویجت کاربر به `availed` / `unAvailed` subscribe می‌کند.
3. اگر اپراتور در دسترس نباشد، `open` به `queued` می‌رسد و گفتگو باز نمی‌شود.
4. نمایش تعداد اپراتور available و رفتار queue به همین وضعیت وابسته‌اند. availability جزئیات UI نیست.

## ۶. API / store / events فعلی

Aggregateهای مشترک:

- `$app.Support.Chat` / `Message` / `Department` / `FAQ` / `Predetermined`
- `$app.User.Staff`
- `$app.Mastering.File`

عملیات دیده‌شده: list / count برای active، open، queued، closed؛ history؛ open / reopen / close / processing / convey؛ send text/file و seen؛ Department / FAQ؛ available staff و availability؛ staff list، avatar، Predetermined.

آپلود مستقیم (REST، نه ABR):

- `POST /support/upload` — avatar
- `POST /file/upload/support` — پیوست (الان JSON + base64)

هدر آپلود: `authorization` از کوکی `user-token` یا `staff-token` (`authToken.js`؛ انتخاب به `side` و در fallback به hostname). ویجت عملاً `jpg,jpeg,png`؛ خطای دیده‌شدهٔ avatar: `WRONG_FILE_TYPE`، `MAXIMUM_FILE_SIZE_LIMIT` (سقف UI آواتار ۶ مگابایت). بعد از آپلود: `Support.Chat(id).sendFile(...).await('messageSent')`. thumbnail از `$app.Mastering.File.lists.support`.

کشف host: `resolveBackHost.js` hostname فرانت را به sibling `back` می‌برد؛ استثنای production موبایل وب: `m.nipoto.org` → `b.nipoto.org`. `ABR_URL` فقط localhost. flavorهایی مثل `b5` / `s4` از subdomain. REST و WebSocket از یک host مشتق می‌شوند؛ `resolveSocketUrl` در این extension مستقیماً مصرف نشده — اتصال اصلی داخل `$app` است.

Vuex در `staff` (`src/store/index.js`): `supportCenter`، `tickets`، `department`، `faq`. `src/store/modules.json` شامل `"support": "support"`. `support/install.js` همین mapping را به host اضافه می‌کند.

`staff/scripts/copy-support-store.js` قرار است store extension را از `node_modules/@nipoto/quasar-app-extension-chat/src/install/src/store/modules/support` به `src/store/modules/support` کپی کند. در snapshot بررسی‌شده مسیر مقصد در `staff` حاضر نبود.

Command await: `.await('opened' | 'queued' | 'closed' | 'messageSent' | 'processing' | 'conveyed')`.

رویدادهای ویجت: `CHAT_OPENED`، `CHAT_QUEUED`، `CHAT_CLOSED`، `NEW_MESSAGE`، `SEEN_MESSAGE`، `MESSAGE_SENT`، `STAFF_JOINED`، `STAFF_LEFT`. همچنین `opened` / `queued` / `closed` / `messageSent` / `processing` / `conveyed` / `availed` / `unAvailed`.

در `staff`، ABR bus (`userNotification/actions.js`) رویدادهای `chatOpen`، `chatClosed`، `chatSystemMessage`، `file`، `messageSent`، `seenMessage` را به emitterهایی مثل `CHAT_OPENED`، `CHAT_CLOSED`، `NEW_MESSAGE`، `SEEN_MESSAGE` map می‌کند.

producer و schema کامل این رویدادها **در این ریپو نیست.** پروتکل WebSocket جدید حدس نزنید. منبع حقیقت اتصال داخل client تزریق‌شدهٔ `$app` است.

نوتیف امروز: `Notification` مرورگر + صدا (`src/lib/beep.js`). Push سرور وجود ندارد. badge تعداد Chat باز در حافظهٔ ویجت است. در iframe همین Notification یکسان عمل نمی‌کند.

## ۷. فیلتر لیست

هیچ‌کدام بعد از fetch ردیف‌ها را در کلاینت دوباره فیلتر نمی‌کنند. اینکه سرور **بدون** این شرط‌ها هم دادهٔ دیگران را رد کند از فرانت معلوم نیست (B4).

### کنسول Ticket (`staff`)

صفحه: `TicketsList.vue` — action: `getTicketList` / `getTicketListCount` — شرط‌ها: `createTicketFilterQuery` — fetch: `$app.Support.Chat.lists.chat` با `where` / `limit` / `skip` / `sort` / `count` / `get` سپس `.send()`.

| فیلد UI | شرط query |
| --- | --- |
| عنوان | `title LIKE %…%` |
| وضعیت | `status`؛ اگر `opened` → `in ['opened', 'reopened']` |
| کارمند | `staff = id` |
| دپارتمان | `department = id` |
| بازهٔ بروزرسانی | `updatedAt >=` و `<=` (شمسی UI → میلادی) |
| صفحه‌بندی / مرتب‌سازی | `limit`، `skip`، `sort` |

- غیرمدیر: UI قبل از هر درخواست `staff` را روی شناسهٔ خودش می‌گذارد؛ dropdown کارمند را نمی‌بیند.
- مدیر (`supportManager`): `staff` می‌تواند خالی باشد؛ dropdown فقط برای اوست.
- جستجوی داخل dropdown وضعیت / کارمند / Department فقط گزینهٔ select را تنگ می‌کند؛ روی ردیف جدول اثر ندارد.

### لیست ویجت (همین ریپو)

`ChatLayout.vue` → `getChatListManagement` / `getClosedChats` / `getQueuedChats` در `actions.js`.

- باز: `lists.chat.getOpenChats({ startRow, rowsPerPage }, filter)` و `countOpenChats(filter)`
- بسته: `getClosedChats(..., filter)`
- صف: `getQueuedChats` — **بدون** فیلتر `self` / `other`
- کاربر (غیر staff): `getActiveChats` — بدون همان فیلتر

`filter` اینجا فقط `'self'` یا `'other'` است. UI این انتخاب را برای `supportManager` نشان می‌دهد؛ پیش‌فرض `'self'`.

### Convey جدا از فیلتر لیست است

انتقال با `$app.Support.Chat(id).convey(data)` (ویجت: `support/conveyChat`؛ کنسول: `supportCenter/conveyChat`). مجوز convey از روی فرانت قطعی نیست.

## ۸. شکاف‌ها و ابهام‌ها

قطعی: `support` ویجت است نه محصول کامل؛ `staff` کنسول اصلی است؛ Ticket همان Chat است.

از روی فرانت قطعی نیست:

1. comment مستقل برای Ticket — فقط chat / system message دیده شد.
2. producer رویداد `NEW_TICKETS_MESSAGE` — صفحات Ticket می‌شنوند؛ producer واضح در فرانت دیده نشد. bus دیده‌شده `NEW_MESSAGE` emit می‌کند.
3. کاربرد عملی `CreateTicket.vue` در `staff` — فایل هست (`support/components/CreateTicket.vue`)؛ wiring فعال در routeهای Support پیدا نشد.
4. نسخهٔ runtime ماژول `support` در `staff` — اسکریپت copy هست؛ حضور `src/store/modules/support` تأیید نشد.
5. آیا سرور بدون `where staff` هم لیست را محدود می‌کند، و convey سمت سرور enforce می‌شود (B4).

## ۹. جدول موجودی

| Feature | Repo | مسیر / شواهد | توضیح |
| --- | --- | --- | --- |
| Floating chat widget | `support` | `ChatHome.vue`، `ChatLayout.vue` | ویجت مشترک user / staff |
| Global `Chat` registration | `support` | `register-chat.js`، `src/index.js` | embed در میزبان |
| Inject store module `support` | `support` | `src/install.js` | به store میزبان وصل می‌شود |
| Staff layout embeds widget | `staff` | `PanelLayout.vue` | `<Chat side="staff" />` |
| Support section routes | `staff` | `support/routes.js` | پوستهٔ back-office |
| Ticket list | `staff` | `TicketsList.vue` | فیلتر، pagination، assignment |
| Ticket detail / chat view | `staff` | `TicketLayout.vue` | صفحهٔ جزئیات |
| Ticket messages | `staff` | `tickets/chat/ChatMessagesList.vue` | timeline و optimistic update |
| Send message / file in ticket | `staff` | `tickets/chat/InputBox.vue` | متن + attachment |
| Profile / sidebar in ticket | `staff` | `tickets/chat/ProfileUser.vue` | وضعیت، شناسه، لینک کاربر |
| Reassign staff / department | `staff` | `tickets/ConveyChat.vue` | convey |
| Predetermined management | `staff` | `PredeterminedAnswers.vue` | CRUD |
| Department management | `staff` | `department/DepartmentIndex.vue` | CRUD |
| FAQ management | `staff` | `faq/FAQIndex.vue` | CRUD و فیلتر |
| Staff availability | `staff` | `staffList.vue`، `dashboard/store/actions.js` | avail / unAvail |
| Widget consumes FAQ | `support` | `FAQ/FAQList.vue`، `actions.js` | FAQ قبل از Chat |
| Widget consumes department | `support` | `StartConv.vue`، `actions.js` | انتخاب Department |
| Shared chat domain actions | هر دو | `support/.../actions.js` و storeهای `tickets` / `supportCenter` در `staff` | هر دو به `$app.Support.*` |
