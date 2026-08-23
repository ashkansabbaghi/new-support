# معماری ویجت چت Nipoto

> سند طراحی فنی — نسخه ۱
> این سند «چی و چرا» را توضیح می‌دهد. برای «مراحل اجرا» به [IMPLEMENTATION-PLAN.fa.md](./IMPLEMENTATION-PLAN.fa.md) مراجعه کنید.
> English version: [`ARCHITECTURE.en.md`](./ARCHITECTURE.en.md)

---

## ۰. خلاصه‌ی اجرایی

یک پکیج مستقل به نام `@nipoto/chat` ساخته می‌شود که سه چیز را همزمان حل می‌کند:

1. **حذف کپی‌پیست** بین `user-panel` و `staff` در بخش تیکتینگ
2. **قابل استفاده در هر پروژه‌ای** (Vue، React، وردپرس، HTML خام) بدون نیاز به build
3. **رنگ‌بندی مستقل برای هر بیزینس** بدون build یا باندل جداگانه

روش: کامپوننت‌ها با Vue نوشته می‌شوند اما با `defineCustomElement` به **Web Component استاندارد** تبدیل می‌شوند. منطق در یک لایه‌ی JS خالص (`core`) جدا نگه داشته می‌شود.

```
یک سورس  →  دو خروجی build  →  همه‌ی مصرف‌کننده‌ها
```

---

## ۱. مسئله

### ۱.۱ وضعیت فعلی

پروژه‌ی `support` یک **Quasar App Extension** است، نه یک پکیج معمولی:

- `src/install.js` با Install API کوازار، ماژول Vuex را **فیزیکی داخل `src/store` اپ میزبان کپی می‌کند**
- `src/index.js` با `api.extendQuasarConf()` بوت‌فایل و CSS را به build اپ میزبان تزریق می‌کند
- کامپوننت اصلی `ChatLayout.vue` حدود ۱۷۸۰ خط با ~۴۰ عدد `provide` است که ~۱۵ کامپوننت فرزند از طریق `inject` به آن وصل‌اند
- تقریباً کل کتابخانه‌ی Quasar UI به‌عنوان وابستگی runtime لازم است
- آدرس بک‌اند از روی `window.location.hostname` حدس زده می‌شود

نتیجه: فقط داخل اپ‌های Quasar قابل استفاده است.

### ۱.۲ کپی‌پیست و drift واقعی

بخش تیکتینگ در دو اپ **دستی کپی شده** و هیچ وابستگی پکیجی ندارد:

| فایل | user-panel | staff |
|---|---|---|
| `ChatMessagesList.vue` | ✅ | ✅ — **بایت‌به‌بایت یکسان** |
| `ChatComponent.vue` | ✅ | ✅ — واگرا شده |
| `InputBox.vue` | ✅ | ✅ |
| `store/actions.js` | ✅ | ✅ — ~۹۰٪ یکسان |

**باگ‌های زنده‌ای که همین الان از این کپی ناشی شده‌اند:**

1. `user-panel` به route با نام `TicketList` می‌رود، `staff` به `TicketsList` — یکی از این دو غلط است.
2. `user-panel` نام دپارتمان را با `ref` + `forEach` می‌خواند (که با تغییر chat به‌روز نمی‌شود)؛ `staff` همین را با `computed` + `watch` فیکس کرده.
3. در `user-panel` منطق `status === 'opened' → ['opened','reopened']` فقط داخل `getTicketListCount` است و در `createTicketFilterQuery` نیست. **نتیجه: تعداد نمایش‌داده‌شده با لیست واقعی نمی‌خواند.**

تنها تفاوت واقعی و عمدی بین دو `actions.js`، نام کوکی است: `user-token` در برابر `staff-token`.

### ۱.۳ نیازمندی‌ها

| # | نیازمندی |
|---|---|
| R1 | قابل استفاده در Vue، React، وردپرس و هر پروژه‌ی دیگر |
| R2 | پایان کپی‌پیست بین user-panel و staff |
| R3 | رنگ‌بندی سازمانی مستقل برای حداقل دو بیزینس |
| R4 | کد بهینه و تمیز |
| R5 | **آینده‌نگری**: دست برای توسعه و تغییرات بعدی باز بماند |

---

## ۲. تصمیمات معماری

هر تصمیم با دلیل و گزینه‌های رد شده.

### AD-1 — Web Component با Vue `defineCustomElement`

**تصمیم:** کامپوننت‌ها با Vue SFC نوشته می‌شوند و با `defineCustomElement` به Custom Element با Shadow DOM تبدیل می‌شوند.

**چرا:**
- تیم مهارت Vue دارد؛ ابزار و روش کار عوض نمی‌شود
- Custom Element استاندارد مرورگر است، نه قابلیت فریم‌ورک — برای React و وردپرس فقط یک تگ HTML است
- Shadow DOM دوطرفه ایزوله می‌کند: CSS وردپرس داخل ویجت نمی‌آید، CSS ویجت بیرون نشت نمی‌کند

**گزینه‌های رد شده:**
- *نوشتن `ui-vue` و `ui-react` جداگانه* → دو UI یعنی همان مشکل کپی‌پیست در سطح بالاتر
- *نوشتن UI با Lit یا DOM خام* → کل تیم برای سرویس‌دادن به یک React فرضی باید با روش ناآشنا کار کند
- *پکیج معمولی Vue (مثل `nipoto-ui`)* → R1 را برآورده نمی‌کند

**هزینه‌ی پذیرفته‌شده:** رانتایم Vue (~۲۰KB gzip) داخل باندل خارجی می‌رود.

### AD-2 — سطح Shadow DOM کوچک نگه داشته می‌شود

**تصمیم:** فقط **ناحیه‌ی مکالمه** (لیست پیام + باکس نوشتن) داخل Custom Element می‌رود. هدر تیکت، لیست تیکت‌ها، سایدبار، دکمه‌های عملیات در اپ میزبان می‌مانند.

**چرا:** محدودیت استایل Shadow DOM فقط روی چیزی اعمال می‌شود که داخلش است. آنچه باید همه‌جا یک‌شکل باشد (حباب پیام) داخل می‌رود؛ آنچه باید بومی اپ باشد (هدر، دکمه‌ها) بیرون می‌ماند و با CSS خود اپ استایل می‌گیرد.

### AD-3 — `core` بدون reactivity ویو

**تصمیم:** لایه‌ی منطق یک استور خنثی با `getSnapshot()` / `subscribe()` است. از `reactive()` یا `ref()` استفاده نمی‌کند.

**چرا:** اگر state با reactivity ویو ساخته شود، هیچ مصرف‌کننده‌ی غیر‌Vue نمی‌تواند آن را observe کند و راه فرار سطح ۶ (§۸.۵) بسته می‌شود. هزینه‌ی این انضباط امروز صفر است و کد را تست‌پذیرتر هم می‌کند.

### AD-4 — `capability` به‌جای `role`

**تصمیم:** پکیج هرگز نمی‌پرسد «کاربر staff است؟». فقط `capabilities` را از میزبان دریافت می‌کند.

**چرا:** منطق نقش‌ها مخصوص هر اپ است و تغییر می‌کند. اگر داخل پکیج مشترک باشد، هر تغییر پرمیژن یعنی release پکیج + آپدیت همه‌ی اپ‌ها. کد فعلی (`props: { side: 'user'|'staff' }` و `checkRoles(['supporter'])` داخل پکیج) دقیقاً همین ضدالگو است.

### AD-5 — API عمومی فقط attribute رشته‌ای و DOM event

**تصمیم:** سطح عمومی Custom Element با attribute و `CustomEvent` کار می‌کند، نه با prop شیءای اجباری.

**چرا:** در React قبل از نسخه ۱۹، prop پیچیده روی Custom Element باید با `ref` ست شود. اگر API فقط رشته و رویداد باشد، این مشکل اصلاً پیش نمی‌آید و wrapper لازم نیست. ضمناً attribute در HTML خام و وردپرس هم مستقیم قابل نوشتن است.

### AD-6 — تم از فایل JSON استاتیک، نه هاردکد و نه (فعلاً) API

**تصمیم:** هر بیزینس یک فایل JSON روی CDN دارد. ویجت با `tenant` آن را می‌خواند. یک preset داخل باندل به‌عنوان fallback می‌ماند.

**چرا:**
- تغییر رنگ = آپلود یک فایل، نه release پکیج
- **همان code path آینده است** — روزی که API لازم شد، فقط URL عوض می‌شود، صفر بازنویسی
- fallback داخلی یعنی اگر fetch شکست خورد، ویجت بدون برند نمی‌ماند

### AD-7 — انتشار روی رجیستری موجود

**تصمیم:** همان رجیستری خصوصی GitLab که `nipoto-ui` استفاده می‌کند (`git.services.iranpage.net`). زیرساخت جدید ساخته نمی‌شود.

### AD-8 — احراز هویت به‌صورت پلاگین‌پذیر، نه توکن رشته‌ای

**تصمیم:** پکیج یک `AuthConfig` می‌گیرد (`cookie` | `bearer` با تابع `getToken` | `guest`)، نه یک رشته‌ی `token`. توکن هرگز attribute نمی‌شود.

**چرا:**
- در برنامه است که توکن `httpOnly` شود و از دسترس JS خارج شود. با `token: string` آن روز یک breaking change اجتناب‌ناپذیر می‌شد
- attribute یعنی توکن داخل DOM می‌نشیند و در inspector و هر serialize شدن HTML دیده می‌شود — دقیقاً همان چیزی که httpOnly می‌خواهد از آن جلوگیری کند
- تابع به‌جای رشته، refresh را بدون رندر دوباره‌ی المان حل می‌کند

جزئیات کامل در §۵.۷.

---

## ۳. نمای کلی

```
┌─────────────────────────────────────────────────────┐
│                    @nipoto/chat                      │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  core/                    JS خالص، بدون فریم‌ورک │  │
│  │  • ChatClient (سوکت، state، دستورات)            │  │
│  │  • session (authenticated | anonymous)          │  │
│  │  • منطق headless UI (گروه‌بندی، اسکرول، composer)│  │
│  │  • theme resolver                               │  │
│  └────────────────────────────────────────────────┘  │
│                        ▲                              │
│  ┌────────────────────────────────────────────────┐  │
│  │  ui/                      کامپوننت‌های Vue        │  │
│  │  • MessageList, Bubble, Composer, Header ...    │  │
│  │  • بدون Quasar، فقط HTML/CSS                     │  │
│  └────────────────────────────────────────────────┘  │
│                        ▲                              │
│  ┌────────────────────────────────────────────────┐  │
│  │  elements/                Custom Elements       │  │
│  │  <nipoto-conversation>    <nipoto-chat>         │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │                    │                  │
    /core (npm)         /element (npm)     chat.iife.js (CDN)
         │                    │                  │
    React با UI خودش    user-panel, staff    وردپرس, مشتری‌ها
```

### مصرف‌کننده‌ها

| مصرف‌کننده | چه چیزی می‌گیرد | Shadow DOM |
|---|---|---|
| وردپرس / سایت مشتری | `<script>` + `<nipoto-chat>` | ✅ |
| user-panel — ویجت شناور | `@nipoto/chat/element` (esm) | ✅ |
| user-panel — صفحه‌ی تیکت | `<nipoto-conversation>` | ✅ کوچک |
| staff — ورک‌اسپیس تیکت | `<nipoto-conversation>` | ✅ کوچک |
| اپ React مشتری (رنگ متفاوت) | `<script>` + `<nipoto-chat>` | ✅ |
| هر کسی که UI کاملاً خودش را بخواهد | `@nipoto/chat/core` | ❌ |

---

## ۴. ساختار ریپو

```
chat-widget/
├── src/
│   ├── core/                       # لایه ۱ — JS خالص
│   │   ├── client.ts               # createChatClient
│   │   ├── store.ts                # استور خنثی (getSnapshot/subscribe)
│   │   ├── session.ts              # authenticated | anonymous
│   │   ├── transport/
│   │   │   ├── abr.ts              # wrapper روی @abr/client
│   │   │   └── rest.ts             # آپلود فایل (تنها بخش REST)
│   │   ├── logic/                  # منطق UI بدون رندر
│   │   │   ├── grouping.ts         # گروه‌بندی پیام بر اساس روز/فرستنده
│   │   │   ├── scroll.ts           # کنترلر «چسبیدن به پایین»
│   │   │   ├── composer.ts         # state باکس نوشتن + پیوست
│   │   │   └── upload.ts           # اعتبارسنجی فایل
│   │   ├── theme.ts                # resolve و اعمال توکن‌ها
│   │   ├── i18n.ts                 # دیکشنری سبک داخلی (بدون vue-i18n)
│   │   ├── format.ts               # تاریخ شمسی با Intl، بدون کتابخانه
│   │   └── types.ts
│   │
│   ├── ui/                         # لایه ۲ — کامپوننت‌های Vue
│   │   ├── Conversation.ce.vue     # ریشه‌ی <nipoto-conversation>
│   │   ├── ChatWidget.ce.vue       # ریشه‌ی <nipoto-chat>
│   │   ├── parts/
│   │   │   ├── MessageList.vue
│   │   │   ├── MessageBubble.vue
│   │   │   ├── SystemMessage.vue
│   │   │   ├── TypingIndicator.vue
│   │   │   ├── Composer.vue
│   │   │   ├── AttachmentPicker.vue
│   │   │   ├── Launcher.vue        # دکمه‌ی شناور
│   │   │   ├── WidgetHeader.vue
│   │   │   ├── StartForm.vue       # شروع مکالمه (ناشناس)
│   │   │   ├── QueueStatus.vue
│   │   │   └── FaqList.vue
│   │   └── composables/
│   │       ├── useChatState.ts     # پل core → Vue (shallowRef + subscribe)
│   │       └── useTheme.ts
│   │
│   ├── styles/
│   │   ├── tokens.css              # تعریف کامل CSS custom properties
│   │   ├── reset.css
│   │   └── base.css
│   │
│   ├── tenants/                    # preset های fallback داخل باندل
│   │   ├── default.json
│   │   ├── business-a.json
│   │   └── business-b.json
│   │
│   └── entries/
│       ├── core.ts                 # export لایه core
│       ├── element.ts              # register هر دو custom element
│       └── element-auto.ts         # element.ts + خودثبت‌کنندگی برای <script>
│
├── demo/
│   ├── plain.html                  # تست embed بدون build (شبیه‌ساز وردپرس)
│   ├── react/                      # تست مصرف در React
│   └── vue/                        # تست مصرف در Vue/Quasar
│
├── kian/                           # اسناد طراحی
│   ├── ARCHITECTURE.fa.md          # همین فایل
│   ├── ARCHITECTURE.en.md
│   ├── IMPLEMENTATION-PLAN.fa.md
│   ├── IMPLEMENTATION-PLAN.en.md
│   ├── PUBLIC-API.md               # قرارداد عمومی (attribute/event/part/slot/token)
│   └── EMBEDDING.md                # راهنمای مشتری خارجی
│
├── vite.config.ts                  # build: element (esm + iife)
├── vite.core.config.ts             # build: core
├── package.json
├── .npmrc / .yarnrc.yml
└── .gitlab-ci.yml
```

---

## ۵. لایه Core

### ۵.۱ ورودی اصلی

```ts
import { createChatClient } from '@nipoto/chat/core';

const client = createChatClient({
  apiBase:  'https://back.nipoto.org',   // اجباری، هرگز از hostname حدس زده نمی‌شود
  auth:     AuthConfig,                   // §۵.۷
  tenant?:  string,                       // شناسه‌ی بیزینس
  locale?:  'fa' | 'en',
});
```

**قاعده‌ی سخت:** `apiBase` همیشه صریح پاس داده می‌شود.

**قاعده‌ی سخت دوم:** توکن هرگز به‌صورت رشته‌ی ثابت گرفته نمی‌شود — همیشه از طریق `AuthConfig` (§۵.۷). دلیلش در AD-8 آمده است. تابع `resolveBackHost.js` فعلی که از `window.location.hostname` استفاده می‌کند **منتقل نمی‌شود** — روی دامنه‌ی مشتری خارجی کار نمی‌کند.

### ۵.۲ شکل State

```ts
type ConversationStatus =
  | 'queued' | 'processing' | 'opened' | 'reopened'
  | 'staff replied' | 'user replied' | 'conveyed' | 'requeued' | 'closed';

interface Message {
  id: string;
  kind: 'text' | 'file' | 'image' | 'system';
  direction: 'in' | 'out';
  text?: string;
  file?: { id: string; name: string; size: number; mime: string; url?: string };
  systemEvent?: 'joined' | 'left' | 'closed' | 'conveyed' | 'reopened' | 'queued';
  authorId?: string;
  createdAt: string;
  seenAt?: string;
  pending?: boolean;   // ارسال خوش‌بینانه، هنوز تأیید نشده
  failed?: boolean;    // ارسال شکست خورد، قابل retry
}

interface Conversation {
  id: string;
  title: string;
  status: ConversationStatus;
  departmentId?: string;
  assigneeId?: string;
  messages: Message[];
  messagesLoaded: boolean;
  typing: boolean;
  unread: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  connection: 'idle' | 'connecting' | 'ready' | 'reconnecting' | 'error';
  conversations: Record<string, Conversation>;
  activeId: string | null;
  unreadTotal: number;
  queuePosition: number | null;
  error: { code: string; message: string } | null;
}
```

**نکته‌ی بهبود نسبت به کد فعلی:** فیلدهای `pending` و `failed` امکان **ارسال خوش‌بینانه** را می‌دهند — پیام بلافاصله در UI ظاهر می‌شود و در صورت خطا قابل تلاش مجدد است. کد فعلی این را ندارد.

### ۵.۳ API استور

```ts
client.getSnapshot(): ChatState
client.subscribe(listener: (state: ChatState) => void): () => void
```

فقط همین دو تا. هر فریم‌ورکی می‌تواند به آن وصل شود:

```ts
// Vue
const state = shallowRef(client.getSnapshot());
onUnmounted(client.subscribe(s => state.value = s));

// React
const state = useSyncExternalStore(client.subscribe, client.getSnapshot);

// خام
client.subscribe(render);
```

### ۵.۴ دستورات

```ts
client.connect(): Promise<void>
client.disconnect(): void

client.loadConversation(id: string): Promise<void>
client.loadMessages(id: string, opts?: { before?: string; limit?: number }): Promise<void>

client.sendText(conversationId: string, text: string): Promise<void>
client.sendFile(conversationId: string, file: File): Promise<void>
client.retry(messageId: string): Promise<void>

client.openConversation(input: { departmentId: string; title: string }): Promise<string>
client.closeConversation(id: string): Promise<void>
client.markSeen(conversationId: string): void
client.setTyping(conversationId: string, isTyping: boolean): void

client.setActive(id: string | null): void
```

**نکته درباره‌ی صفحه‌بندی پیام‌ها:** کد فعلی همه‌ی پیام‌ها را با `limit: 10000` یک‌جا می‌گیرد. در پیاده‌سازی جدید `loadMessages` باید صفحه‌بندی واقعی با `before` داشته باشد.

### ۵.۵ منطق headless UI

این‌ها منطق‌اند نه رندر، پس در `core` می‌مانند تا اگر روزی UI دیگری نوشته شد، دوباره نوشته نشوند:

| ماژول | مسئولیت |
|---|---|
| `logic/grouping.ts` | گروه‌بندی پیام بر اساس روز و فرستنده‌ی پشت‌سرهم، جای خط «پیام‌های خوانده‌نشده» |
| `logic/scroll.ts` | تشخیص «کاربر پایین است؟»، تصمیم اسکرول خودکار، شمارنده‌ی «N پیام جدید» |
| `logic/composer.ts` | state متن و پیوست‌ها، debounce نشانگر typing، ارسال با Enter در برابر Shift+Enter |
| `logic/upload.ts` | اعتبارسنجی حجم/نوع فایل قبل از آپلود |
| `format.ts` | تاریخ شمسی |

**تاریخ شمسی:** به‌جای وابستگی به کتابخانه، از API بومی مرورگر استفاده می‌شود:

```ts
new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' }).format(date)
```

صفر بایت به باندل اضافه می‌کند.

**i18n:** به‌جای `vue-i18n`، یک دیکشنری ساده‌ی داخلی. برای دو زبان ارزش وارد کردن یک کتابخانه‌ی کامل به باندل ویجت را ندارد. متن‌ها از طریق کانفیگ tenant قابل override هستند.

### ۵.۶ Session و احراز هویت

دو حالت، یک transport مشترک:

```ts
// authenticated — اپ میزبان از قبل احراز هویت شده است
createChatClient({ apiBase, auth: { kind: 'cookie' } })

// anonymous — بازدیدکننده‌ی سایت خارجی، کوکی لاگین وجود ندارد
createChatClient({ apiBase, auth: { kind: 'guest', tenant: 'business-a' } })
```

جزئیات کامل `AuthConfig` و مسیر مهاجرت به کوکی httpOnly در §۵.۷ آمده است.

**جریان حالت ناشناس:**

1. `visitorId` از `localStorage` با کلید `nipoto-chat:{tenant}:visitor` خوانده می‌شود
2. اگر نبود، `crypto.randomUUID()` ساخته و ذخیره می‌شود
3. با آن یک guest token از بک‌اند گرفته می‌شود
4. از این‌جا به بعد مسیر با حالت authenticated یکسان است

نکات:
- کلید `localStorage` با `tenant` جدا می‌شود تا دو بیزینس روی یک دامنه با هم تداخل نکنند
- اگر `localStorage` در دسترس نبود (حالت خصوصی، iframe محدود)، به session درون‌حافظه‌ای برمی‌گردد
- ⚠️ **فقط `visitorId` در `localStorage` ذخیره می‌شود، هرگز خودِ guest token.** توکن هر بار از روی `visitorId` تازه گرفته می‌شود و فقط در حافظه می‌ماند
- **این حالت به یک endpoint سمت بک‌اند نیاز دارد که هنوز وجود ندارد** و باید با تیم بک‌اند هماهنگ شود

بعد از resolve شدن session، هر دو حالت از یک `transport/abr.ts` استفاده می‌کنند. `@abr/client` از قبل framework-agnostic است (بر پایه‌ی `isomorphic-ws`) و نیازی به جایگزینی ندارد.

### ۵.۷ `AuthConfig` و مسیر httpOnly

**وضعیت امروز:** توکن در کوکی‌ای است که JS می‌تواند بخواند (`user-token` / `staff-token`) و `@abr/client` آن را بعد از handshake با کامند `sendToken` می‌فرستد.

**برنامه‌ی آینده:** توکن `httpOnly` می‌شود و از دسترس JS خارج می‌شود.

پکیج طوری طراحی می‌شود که این گذار **هیچ تغییر شکننده‌ای** ایجاد نکند. کلید کار، گرفتن *روشِ* احراز هویت به‌جای *مقدارِ* توکن است:

```ts
type AuthConfig =
  // کوکی httpOnly — مرورگر خودش handshake و درخواست‌ها را امضا می‌کند.
  // هیچ چیزی پاس داده نمی‌شود چون هیچ چیزی برای پاس دادن وجود ندارد.
  | { kind: 'cookie' }

  // توکن در اختیار JS. تابع است نه رشته، تا refresh بدون
  // رندر دوباره‌ی المان کار کند.
  | { kind: 'bearer'; getToken: () => string | Promise<string> }

  // بازدیدکننده‌ی ناشناس. پکیج خودش توکن مهمان را می‌گیرد.
  | { kind: 'guest'; tenant: string };
```

#### چرا تابع، نه رشته

با `token: string` هر بار که توکن refresh شود، میزبان باید attribute یا prop را عوض کند و المان دوباره رندر شود. با `getToken()` پکیج در لحظه‌ی نیاز مقدار تازه را می‌گیرد. این حتی **قبل از** httpOnly هم رفتار درست‌تری است.

#### تأثیر httpOnly روی هر لایه

| لایه | امروز | بعد از httpOnly |
|---|---|---|
| WebSocket | JS کوکی را می‌خواند و `sendToken` می‌فرستد | مرورگر کوکی را در **handshake** می‌فرستد؛ سرور همان‌جا احراز هویت می‌کند |
| آپلود فایل (REST) | `headers: { authorization: <token> }` | `credentials: 'include'` |
| انقضای توکن | JS می‌تواند توکن را بخواند و بررسی کند | JS چیزی نمی‌بیند — مدیریت **واکنشی** (پایین) |

WebSocket موقع باز شدن یک درخواست HTTP معمولی با `Upgrade` است، پس مرورگر کوکی‌های آن مبدأ را خودکار ضمیمه می‌کند. یعنی احراز هویت بدون اینکه JS توکن را ببیند ممکن است.

#### ⚠️ محدودیت تعیین‌کننده: کوکی برای embed خارجی کار نمی‌کند

```
app.nipoto.org   →  back.nipoto.org      ✅ same-site، کوکی می‌رسد
merchant.com     →  back.nipoto.org      ❌ کوکی third-party
```

برای سایت مشتری، کوکی third-party محسوب می‌شود. حتی با `SameSite=None; Secure` هم Safari (ITP) آن را بلاک می‌کند و Chrome در حال حذف تدریجی آن است.

**نتیجه:** جدایی دو حالت یک انتخاب سلیقه‌ای نیست، اجباری است:

| حالت | مصرف‌کننده | `AuthConfig` |
|---|---|---|
| authenticated | user-panel، staff (same-site) | `{ kind: 'cookie' }` |
| guest | سایت مشتری، وردپرس | `{ kind: 'guest', tenant }` — توکن در حافظه |

#### مدیریت انقضا

چون JS نمی‌تواند انقضا را ببیند، refresh پیش‌دستانه ممکن نیست. رفتار باید واکنشی باشد:

1. روی `401` یا خطای احراز هویت سوکت → یک بار تلاش برای refresh و اتصال مجدد
2. اگر باز هم شکست خورد → رویداد `nipoto-chat:auth-expired` و توقف تلاش مجدد
3. تصمیم بعدی با میزبان است (redirect به لاگین، نمایش پیام) — پکیج هرگز خودش redirect نمی‌کند

#### CSRF

به‌محض اینکه احراز هویت با کوکی انجام شود، درخواست‌های تغییردهنده (به‌ویژه POST آپلود فایل) در معرض CSRF قرار می‌گیرند. `SameSite=Lax` بخش زیادی را پوشش می‌دهد اما با حالت cross-site نمی‌سازد. پکیج باید بتواند یک هدر CSRF بفرستد:

```ts
createChatClient({ apiBase, auth: { kind: 'cookie' }, csrf: () => string })
```

تصمیم درباره‌ی مکانیزم CSRF با بک‌اند است؛ پکیج فقط باید امکانش را داشته باشد.

#### کارهای خارج از این ریپو

این‌ها باید هماهنگ شوند و در اسکوپ این پکیج نیستند:

1. **`@abr/client`** — الان `Auth.getToken()` کوکی را با JS می‌خواند و `sendToken` می‌فرستد. باید بتواند به احراز هویت مبتنی بر handshake هم کار کند. این کتابخانه در اپ‌های میزبان هم استفاده می‌شود، پس تغییرش فراتر از این پروژه است.
2. **بک‌اند** — احراز هویت WebSocket از هدر handshake؛ CORS با `Access-Control-Allow-Credentials: true` و origin صریح (نه `*`) برای آپلود؛ endpoint گرفتن guest token.

#### چه چیزی امروز باید رعایت شود

تا وقتی کوکی خوانا است، `{ kind: 'bearer', getToken }` استفاده می‌شود. روز مهاجرت فقط این خط در اپ میزبان عوض می‌شود:

```diff
- auth: { kind: 'bearer', getToken: () => Cookies.get('staff-token') }
+ auth: { kind: 'cookie' }
```

هیچ چیز دیگری در پکیج تغییر نمی‌کند.

---

## ۶. لایه UI

### ۶.۱ اصول

1. **بدون Quasar.** هیچ `q-*` ای وجود ندارد. همه با HTML و CSS نوشته می‌شود.
2. **بدون `provide`/`inject` سراسری.** `ChatLayout.vue` فعلی ~۴۰ عدد `provide` دارد؛ این الگو منتقل نمی‌شود. ارتباط با props/emits صریح یا composable های نام‌دار است.
3. **بدون Vuex.** state داخل `core` است.
4. **کامپوننت‌ها نازک‌اند.** هر منطقی که رندر نیست باید در `core/logic` باشد.

### ۶.۲ معادل‌های Quasar

| Quasar فعلی | جایگزین |
|---|---|
| `q-layout` / `q-drawer` | CSS Grid + transform با ترنزیشن |
| `q-fab` | `<button>` + CSS |
| `q-chat-message` | `MessageBubble.vue` |
| `q-virtual-scroll` | فاز اول: بدون virtualization. فقط اگر سنجش نشان داد لازم است اضافه شود |
| `q-uploader` | `<input type="file">` + drag/drop |
| `q-scroll-area` | `overflow: auto` + استایل اسکرول‌بار |
| `q-input` / `q-select` | `<textarea>` / `<select>` استایل‌شده |
| `Notify` | رویداد `nipoto-chat:notify` به بیرون — میزبان تصمیم می‌گیرد |
| `v-touch-pan` | Pointer Events بومی |
| `useQuasar().lang.rtl` | attribute `dir` روی `:host` |

### ۶.۳ قرارداد `part` و `slot`

> **این بخش حیاتی است.** افزودن `part` و `slot` هنگام نوشتن هزینه‌ی صفر دارد، اما افزودن بعدی‌شان نیازمند release است. روی **هر** المان معنادار `part` بگذارید، حتی اگر امروز کسی نخواهد.

**`part` های اجباری:**

```
launcher, launcher-badge,
panel, header, header-title, header-avatar, header-actions, close-button,
body, message-list, date-separator, unread-divider,
bubble, bubble-sent, bubble-received, bubble-system, bubble-text,
bubble-time, bubble-status, attachment, avatar,
typing-indicator,
composer, composer-input, send-button, attach-button, emoji-button,
footer, powered-by,
start-form, department-select, queue-status, faq-list, faq-item,
empty-state, error-state, loading-state
```

**`slot` های اجباری:**

```
header            — جایگزینی کامل هدر
header-actions    — افزودن دکمه کنار دکمه‌های موجود
launcher-icon     — آیکن دلخواه برای دکمه‌ی شناور
empty-state       — حالت خالی دلخواه
footer            — جایگزینی فوتر
message-actions   — اکشن روی هر پیام
```

نکته: محتوای `slot` در light DOM می‌ماند و با CSS **اپ میزبان** استایل می‌گیرد — که برای دکمه‌های اختصاصی staff دقیقاً مطلوب است.

---

## ۷. Custom Elements — API عمومی

> این بخش **قرارداد پایدار** است. بعد از اولین انتشار خارجی، شکستن آن ممنوع است.

### ۷.۱ `<nipoto-conversation>`

فقط ناحیه‌ی مکالمه. برای جاسازی در صفحه‌ی تیکت.

**Attribute ها:**

| نام | نوع | توضیح |
|---|---|---|
| `api-base` | string | اجباری |
| `conversation-id` | string | مکالمه‌ای که نمایش داده می‌شود |
| `locale` | `fa` \| `en` | پیش‌فرض `fa` |
| `dir` | `rtl` \| `ltr` | پیش‌فرض `rtl` |
| `capabilities` | JSON string | §۹ |
| `theme` | JSON string | override تم |
| `readonly` | boolean | مکالمه‌ی بسته، بدون امکان ارسال |

**Property ها** (برای مقادیر پیچیده، از JS):

```js
el.client        // اشتراک‌گذاری یک ChatClient بین چند المان
el.auth          // AuthConfig — §۵.۷
el.capabilities  // به‌جای attribute رشته‌ای
el.theme
```

⚠️ **توکن هرگز attribute نیست.** فقط از طریق `el.auth` یا `el.client` داده می‌شود، تا داخل DOM ننشیند (AD-8).

**متدها:**

```js
el.insertText(text)        // درج در باکس نوشتن — برای پاسخ آماده‌ی staff
el.focusComposer()
el.scrollToBottom()
el.reload()
```

**رویدادها** (همه `CustomEvent` با `detail`):

```
nipoto-chat:ready
nipoto-chat:message-sent      { conversationId, message }
nipoto-chat:message-received  { conversationId, message }
nipoto-chat:conversation-closed { conversationId }
nipoto-chat:unread-changed    { total }
nipoto-chat:notify            { level: 'success'|'error'|'info', message }
nipoto-chat:auth-expired      { }        // refresh شکست خورد — تصمیم با میزبان
nipoto-chat:error             { code, message }
```

**نمونه‌ی مصرف در staff:**

```vue
<nipoto-conversation
  ref="conv"
  :api-base="apiBase"
  :auth.prop="auth"
  :conversation-id="ticket.id"
  :capabilities.prop="caps"
  @nipoto-chat:notify="onNotify"
  @nipoto-chat:auth-expired="redirectToLogin"
/>
```

```js
// درج پاسخ آماده از دیالوگ خود staff
conv.value.insertText(selectedAnswer);
```

### ۷.۲ `<nipoto-chat>`

ویجت شناور کامل. خودکفا.

همه‌ی attribute های بالا، به‌علاوه:

| نام | نوع | توضیح |
|---|---|---|
| `tenant` | string | شناسه‌ی بیزینس — برای بارگذاری کانفیگ |
| `mode` | `authenticated` \| `anonymous` | اگر ندهید، از `AuthConfig` استنتاج می‌شود (`guest` → anonymous) |
| `position` | `bottom-right` \| `bottom-left` | پیش‌فرض `bottom-right` |
| `offset` | string | مثلاً `"24px,24px"` |
| `auto-open` | boolean | باز شدن خودکار |
| `config-url` | string | override آدرس کانفیگ tenant |

متدهای اضافه: `open()`, `close()`, `toggle()`

---

## ۸. سیستم تم

### ۸.۱ توکن‌ها

توکن‌ها فقط رنگ نیستند. سخاوتمند بودن اینجا همان چیزی است که R5 را تضمین می‌کند.

```css
:host {
  /* ── رنگ ── */
  --chat-color-primary:            var(--brand-default, #ff5252);
  --chat-color-primary-hover:      var(--brand-default-hover, #ff6b6b);
  --chat-color-on-primary:         #ffffff;
  --chat-color-surface:            var(--bg-surface-1, #ffffff);
  --chat-color-surface-alt:        var(--bg-surface-2, #f5f6fa);
  --chat-color-text:               var(--text-main, #212121);
  --chat-color-text-muted:         var(--text-secondary, #757575);
  --chat-color-border:             var(--border-default, #e5e6f5);
  --chat-color-bubble-sent-bg:     var(--chat-color-primary);
  --chat-color-bubble-sent-text:   var(--chat-color-on-primary);
  --chat-color-bubble-recv-bg:     var(--chat-color-surface-alt);
  --chat-color-bubble-recv-text:   var(--chat-color-text);
  --chat-color-system:             var(--text-secondary, #9e9e9e);
  --chat-color-danger:             #d32f2f;
  --chat-color-success:            #2e7d32;

  /* ── تایپوگرافی ── */
  --chat-font-family:              inherit;
  --chat-font-size:                14px;
  --chat-font-size-sm:             12px;
  --chat-line-height:              1.7;

  /* ── فرم و فاصله ── */
  --chat-radius:                   12px;
  --chat-radius-bubble:            14px;
  --chat-radius-launcher:          50%;
  --chat-space-unit:               4px;
  --chat-space-sm:                 calc(var(--chat-space-unit) * 2);
  --chat-space-md:                 calc(var(--chat-space-unit) * 4);
  --chat-space-lg:                 calc(var(--chat-space-unit) * 6);

  /* ── ابعاد ── */
  --chat-panel-width:              380px;
  --chat-panel-height:             600px;
  --chat-launcher-size:            56px;
  --chat-header-height:            64px;
  --chat-avatar-size:              36px;

  /* ── سایه و لایه ── */
  --chat-shadow-panel:             0 8px 32px rgba(0,0,0,.16);
  --chat-shadow-launcher:          0 4px 16px rgba(0,0,0,.24);
  --chat-z-index:                  2147483000;

  /* ── حرکت ── */
  --chat-transition-fast:          120ms ease;
  --chat-transition:               240ms cubic-bezier(.4,0,.2,1);
}
```

**نکته‌ی طراحی:** مقدار پیش‌فرض هر توکن خودش `var(--brand-*, fallback)` است. یعنی اگر اپ میزبان از قبل `nipoto-ui` را لود کرده باشد و `--brand-default` تعریف شده باشد، **چت خودکار رنگ برند را می‌گیرد بدون هیچ کانفیگی**. اگر نه (وردپرس)، fallback هاردکد اعمال می‌شود.

### ۸.۲ ترتیب اعمال

از کم‌اولویت به پراولویت:

```
1. پیش‌فرض‌های داخلی        →  :host { }  در tokens.css
2. preset داخل باندل         →  :host { }  تزریق‌شده
3. کانفیگ tenant از CDN      →  :host { }  تزریق‌شده
4. attribute theme            →  :host { }  تزریق‌شده
5. CSS اپ میزبان              →  nipoto-chat { --x: y }   ← همیشه برنده
```

**چرا مورد ۵ برنده است:** طبق مشخصات CSS، برای declaration های عادی، قواعد درخت بیرونی بر قواعد `:host` درخت سایه اولویت دارند. پس مصرف‌کننده همیشه می‌تواند حرف آخر را بزند.

**پیاده‌سازی:** موارد ۲ تا ۴ به‌صورت یک `<style>` با قاعده‌ی `:host { }` داخل shadow root تزریق می‌شوند — **نه** با `element.style.setProperty()`، چون inline style بر CSS میزبان غلبه می‌کند و ترتیب بالا را می‌شکند.

### ۸.۳ فرمت فایل tenant

```
https://cdn.nipoto.../chat/v1/tenants/business-a.json
```

```json
{
  "version": 1,
  "name": "Business A",
  "theme": {
    "color-primary": "#ff5252",
    "color-primary-hover": "#ff6b6b",
    "radius": "12px",
    "font-family": "IRANSans, system-ui, sans-serif"
  },
  "texts": {
    "fa": {
      "launcher.label": "پشتیبانی",
      "start.title": "چطور می‌تونیم کمکتون کنیم؟",
      "composer.placeholder": "پیامتان را بنویسید..."
    }
  },
  "behavior": {
    "position": "bottom-right",
    "showFaq": true,
    "showPoweredBy": true,
    "allowFileUpload": true,
    "maxFileSizeMb": 10
  }
}
```

**قواعد:**
- کلیدهای `theme` بدون پیشوند `--chat-` نوشته می‌شوند؛ کد پیشوند را اضافه می‌کند
- کلید ناشناخته **نادیده گرفته می‌شود، خطا نمی‌دهد** (سازگاری رو به جلو)
- اگر fetch شکست خورد یا timeout شد (۳ ثانیه)، preset داخل باندل استفاده می‌شود و ویجت رندر می‌شود — هرگز به‌خاطر کانفیگ سفید نمی‌ماند
- نتیجه در `sessionStorage` کش می‌شود تا در هر ناوبری دوباره fetch نشود

### ۸.۴ مسیر مهاجرت به API

روزی که کانفیگ سمت سرور لازم شد:

```diff
- config-url = `${cdnBase}/tenants/${tenant}.json`
+ config-url = `${apiBase}/widget-config?tenant=${tenant}`
```

هیچ چیز دیگری عوض نمی‌شود. همین دلیل انتخاب این مدل به‌جای هاردکد است.

### ۸.۵ شش سطح سفارشی‌سازی

| سطح | نیاز مشتری | مکانیزم |
|---|---|---|
| ۱ | رنگ برند | CSS variable |
| ۲ | فونت، رادیوس، فاصله | CSS variable |
| ۳ | استایل یک المان خاص | `::part()` |
| ۴ | چیدمان (چپ/راست، ابعاد) | attribute |
| ۵ | جایگزینی یک ناحیه | `<slot>` |
| ۶ | UI کاملاً متفاوت | `@nipoto/chat/core` |

سطوح ۱ تا ۵ باید از روز اول کامل باشند. سطح ۶ فقط باید ممکن بماند.

---

## ۹. Capabilities

پکیج هرگز نقش کاربر را نمی‌داند.

```ts
interface Capabilities {
  canSendMessage:      boolean;   // پیش‌فرض true
  canUploadFile:       boolean;
  canCloseConversation:boolean;
  canReopen:           boolean;
  canSeeInternalNotes: boolean;
  canUseCannedReplies: boolean;   // فقط دکمه را نشان می‌دهد؛ محتوا از میزبان می‌آید
  canDeleteMessage:    boolean;
}
```

میزبان محاسبه می‌کند:

```js
// staff
{ canCloseConversation: true, canUseCannedReplies: true,
  canReopen: user.roles.includes('supportManager') }

// user-panel
{ canCloseConversation: true, canUseCannedReplies: false, canReopen: false }
```

هر مقدار تعریف‌نشده، پیش‌فرض امن (محدودتر) می‌گیرد.

---

## ۱۰. مرز مسئولیت

| موضوع | پکیج | اپ میزبان |
|---|---|---|
| لیست پیام‌ها، حباب‌ها | ✅ | |
| باکس نوشتن، پیوست | ✅ | |
| اتصال سوکت، state پیام | ✅ | |
| نشانگر typing، seen | ✅ | |
| دکمه‌ی شناور و پنل | ✅ | |
| فرم شروع مکالمه (ناشناس) | ✅ | |
| صف و FAQ | ✅ | |
| **لیست تیکت‌ها، ستون‌ها، فیلترها** | | ✅ |
| **هدر صفحه‌ی تیکت** (تاریخ، عنوان، دپارتمان) | | ✅ |
| **فرم ساخت تیکت** | | ✅ |
| **انتقال / تخصیص به کارشناس** | | ✅ |
| **پاسخ‌های آماده** (محتوا و دیالوگ) | | ✅ |
| **پروفایل کاربر/کارشناس** | | ✅ |
| **منطق نقش و پرمیژن** | | ✅ |
| **روتینگ** | | ✅ |
| **احراز هویت و مالکیت توکن** | (فقط `AuthConfig` را مصرف می‌کند) | ✅ |
| **توست و نوتیفیکیشن** | (رویداد می‌دهد) | ✅ (نمایش) |

**قاعده برای تصمیم‌گیری آینده:** هر چیزی که در هر سه محل (user-panel، staff، ویجت خارجی) یکسان است → پکیج. هر چیزی که حتی در دو محل فرق دارد → اپ.

---

## ۱۱. Build و انتشار

### ۱۱.۱ خروجی‌ها

| فایل | فرمت | Vue | مصرف‌کننده |
|---|---|---|---|
| `dist/core.js` | ESM | — | `@nipoto/chat/core` |
| `dist/element.js` | ESM | external | اپ‌های Vue داخلی |
| `dist/nipoto-chat.iife.js` | IIFE | باندل‌شده | `<script>` خارجی |

### ۱۱.۲ package.json

```jsonc
{
  "name": "@nipoto/chat",
  "type": "module",
  "files": ["dist"],
  "exports": {
    "./core":    { "types": "./dist/core.d.ts",    "import": "./dist/core.js" },
    "./element": { "types": "./dist/element.d.ts", "import": "./dist/element.js" },
    "./styles.css": "./dist/styles.css"
  },
  "peerDependencies": { "vue": "^3.5.0" },
  "peerDependenciesMeta": { "vue": { "optional": true } },
  "publishConfig": {
    "@nipoto:registry": "https://git.services.iranpage.net/api/v4/projects/<ID>/packages/npm/"
  }
}
```

### ۱۱.۳ CDN

```
https://cdn.nipoto.../chat/v1/nipoto-chat.js       ← پایدار، همیشه آخرین v1
https://cdn.nipoto.../chat/v1.2.3/nipoto-chat.js   ← پین‌شده
https://cdn.nipoto.../chat/v1/tenants/*.json
```

**نیازمندی زیرساخت:** یک محل میزبانی استاتیک عمومی لازم است. رجیستری GitLab این کار را نمی‌کند. باید قبل از انتشار خارجی مشخص شود.

### ۱۱.۴ تنظیم لازم در اپ‌های Vue مصرف‌کننده

بدون این تنظیم، Vue تلاش می‌کند `<nipoto-conversation>` را به‌عنوان کامپوننت Vue پیدا کند و warn می‌دهد:

```js
// quasar.config.js
build: {
  vueLoaderOptions: {
    compilerOptions: { isCustomElement: tag => tag.startsWith('nipoto-') }
  }
}
```

---

## ۱۲. محدودیت‌های شناخته‌شده

| # | محدودیت | شدت | راه‌حل |
|---|---|---|---|
| L1 | CSS اپ میزبان به داخل Shadow DOM نمی‌رسد | 🔴 | توکن + `part` + `slot` سخاوتمند از روز اول (§۶.۳، §۸.۱) |
| L2 | API عمومی بعد از انتشار خارجی قابل شکستن نیست | 🔴 | نسخه‌بندی CDN + `PUBLIC-API.md` + §۱۳ |
| L3 | شورتکات کیبورد اپ میزبان موقع تایپ در چت فعال می‌شود | 🟡 | ویجت روی رویدادهای کیبورد `stopPropagation` می‌کند |
| L4 | آنالیتیکس و ضبط جلسه داخل shadow را نمی‌بینند | 🟡 | رویدادهای `nipoto-chat:*` به بیرون داده می‌شود |
| L5 | `document.querySelector` داخل shadow را پیدا نمی‌کند | 🟡 | Playwright خودکار می‌شکافد؛ Cypress نیاز به `includeShadowDom: true` |
| L6 | `document.activeElement` المان میزبان را برمی‌گرداند | 🟢 | `el.shadowRoot.activeElement` |
| L7 | رانتایم Vue دو بار در اپ‌های داخلی | 🟢 | build ESM با Vue خارجی‌شده |
| L8 | SSR ندارد (Nuxt) | 🟢 | بارگذاری client-only |
| L9 | Autofill مرورگر داخل shadow قابل‌اتکا نیست | 🟢 | فرم شروع را کوتاه نگه دارید |
| L10 | نیاز به `isCustomElement` در هر اپ Vue | 🟢 | یک خط کانفیگ، در `EMBEDDING.md` مستند شود |
| L11 | کوکی httpOnly روی دامنه‌ی مشتری (third-party) کار نمی‌کند | 🔴 | حالت `guest` با توکن در حافظه — §۵.۷ |
| L12 | با httpOnly، JS انقضای توکن را نمی‌بیند | 🟡 | مدیریت واکنشی + رویداد `nipoto-chat:auth-expired` — §۵.۷ |

---

## ۱۳. قواعد نگهداری

### چه چیزی «API عمومی» است

هر چیزی در این فهرست، شکستنش نیازمند نسخه‌ی major است:

- نام تگ‌ها (`nipoto-chat`, `nipoto-conversation`)
- نام و معنای attribute ها
- نام و شکل `detail` رویدادها
- نام متدها
- نام `part` ها
- نام `slot` ها
- نام توکن‌های CSS
- شکل فایل JSON کانفیگ tenant
- شکل `AuthConfig` و `Capabilities`
- امضای `@nipoto/chat/core`

این‌ها باید در `kian/PUBLIC-API.md` نگهداری شوند و هر تغییرش در PR جداگانه با review دیده شود.

### قواعد

1. **افزودن آزاد است، حذف و تغییر نام ممنوع.** توکن، part، slot، رویداد جدید همیشه می‌شود اضافه کرد.
2. **کلید ناشناخته در کانفیگ نادیده گرفته می‌شود**، خطا نمی‌دهد.
3. **مقدار پیش‌فرض برای هر attribute جدید** طوری انتخاب شود که رفتار قبلی حفظ شود.
4. **`v1` روی CDN حداقل تا یک سال بعد از انتشار `v2` زنده می‌ماند.**

---

## ۱۴. واژه‌نامه

| واژه | معنی در این سند |
|---|---|
| **tenant** | یک بیزینس که از سرویس چت استفاده می‌کند |
| **host / میزبان** | اپلیکیشنی که ویجت داخلش قرار می‌گیرد |
| **core** | لایه‌ی منطق بدون UI و بدون فریم‌ورک |
| **element** | Custom Element منتشرشده |
| **part** | نقطه‌ی استایل‌پذیر از بیرون Shadow DOM (`::part()`) |
| **capability** | اجازه‌ی انجام یک عمل، که میزبان تعیین می‌کند |
| **authenticated mode** | کاربر از قبل در اپ میزبان لاگین است |
| **anonymous mode** | بازدیدکننده‌ی سایت خارجی، بدون لاگین |
| **AuthConfig** | روش احراز هویت که میزبان اعلام می‌کند: `cookie` / `bearer` / `guest` (§۵.۷) |
