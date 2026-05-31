# Tournament Registration & Check-in System — Project Prompt

## Project Overview

Build a full-stack **Tournament Registration & Check-in Management System** for event organizers. The system supports two distinct user-facing registration flows (Competitor vs. Attendee) and a role-gated admin dashboard with real-time check-in tracking, QR code scanning, and CSV export.

**Deployment target: 100% Cloudflare stack.** Every service must use a Cloudflare product. No Supabase, no Vercel, no AWS.

---

## Infrastructure: Cloudflare Service Map

Each feature is mapped to the correct Cloudflare product. Use the table below as the authoritative reference throughout implementation.

| Feature | Cloudflare Service | Notes |
|---|---|---|
| **Frontend + SSR** | **Cloudflare Workers** (via `@opennextjs/cloudflare`) | Deploy Next.js App Router on Workers. Use `npm create cloudflare@latest -- --framework=next --platform=workers`. NOT Pages — Workers is now preferred for full-stack Next.js. |
| **Primary Database** | **Cloudflare D1** (SQLite at the edge) | All structured data: tournaments, registrations, check-ins. Access via Workers binding `env.DB`. Use Drizzle ORM or `@cloudflare/d1` driver directly. |
| **File Storage** | **Cloudflare R2** | Store uploaded files: applicant photos, intro videos, golf swing videos, official scoreboard files. Access via Workers binding `env.BUCKET`. Serve via public R2 custom domain. |
| **Real-time (Check-in feed + Stats)** | **Cloudflare Durable Objects** + WebSocket | One Durable Object per tournament (`TournamentRoom`). Admin dashboard opens a WebSocket to the DO. When a QR scan check-in happens, the Worker writes to D1 then broadcasts the event to all connected admin dashboards via the DO. Use Hibernation WebSocket API to reduce cost. |
| **Session / Role Cache** | **Cloudflare KV** | Store hashed role tokens per session (short TTL: 8h). Key: `session:{token}` → `{ role, tournamentId }`. Stateless Workers validate session by KV lookup. |
| **Email (QR Code delivery)** | **Cloudflare Email Service** (public beta) | Native Workers binding — no API keys needed. Use `env.EMAIL` binding to send transactional emails. Auto-handles SPF/DKIM/DMARC. Fallback: Resend API via `fetch()` if Email Service binding is unavailable in the project's plan. |
| **Background Jobs (email queue)** | **Cloudflare Queues** | After registration, push job to queue: `{ type: 'send_qr_email', registrationId }`. Consumer Worker generates QR, renders template, sends email. Keeps registration response fast (off the hot path). |
| **Static Assets (images, CSS, JS)** | **Cloudflare Workers Assets** | Bundled automatically by `@opennextjs/cloudflare`. CDN-cached globally at 300+ PoPs. |
| **DNS & Domain** | **Cloudflare DNS** | Manage all DNS records. Auto-configure SPF/DKIM for Email Service. Custom domain for R2 bucket (file delivery). |
| **Secrets Management** | **Cloudflare Workers Secrets** (via `wrangler secret put`) | Store sensitive values: hashed super_admin seed password, Email Service credentials (if using Resend fallback). Never in `.env` committed to git. |
| **CI/CD** | **Cloudflare Workers CI** (GitHub Actions + `wrangler deploy`) | On push to `main` → run `wrangler deploy`. Preview deployments on PR branches. |

---

## Tech Stack

- **Framework**: Next.js 15 (App Router), TypeScript
- **Cloudflare Adapter**: `@opennextjs/cloudflare` — required for Workers deployment
- **Runtime config**: `next.config.mjs` must call `initOpenNextCloudflareForDev()` in dev
- **UI Components**: shadcn/ui — follow `DESIGN.md`
- **ORM**: Drizzle ORM with `drizzle-orm/d1` dialect
- **QR Code Gen**: `qrcode` npm package (server-side PNG generation)
- **QR Code Scan**: `html5-qrcode` (client-side, camera API)
- **CSV Export**: `papaparse` or `json2csv`
- **Local Dev**: `wrangler dev` with `.dev.vars` for secrets; Miniflare emulates D1, R2, KV, DO, Queues locally

---

## Design System

All components must follow `DESIGN.md` conventions. Use shadcn/ui primitives throughout. Admin UI should feel clean and dashboard-like (data-dense, functional). Public registration pages should feel polished and welcoming.

---

## Cloudflare Bindings (`wrangler.jsonc`)

```jsonc
{
  "name": "tournament-app",
  "compatibility_date": "2025-09-01",
  "compatibility_flags": ["nodejs_compat"],

  // D1 — primary database
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "tournament-db",
      "database_id": "<your-d1-database-id>"
    }
  ],

  // R2 — file storage
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "tournament-uploads"
    }
  ],

  // KV — session store
  "kv_namespaces": [
    {
      "binding": "SESSIONS",
      "id": "<your-kv-namespace-id>"
    }
  ],

  // Durable Objects — real-time WebSocket rooms
  "durable_objects": {
    "bindings": [
      {
        "name": "TOURNAMENT_ROOM",
        "class_name": "TournamentRoom"
      }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_classes": ["TournamentRoom"] }
  ],

  // Queues — background email jobs
  "queues": {
    "producers": [
      { "binding": "EMAIL_QUEUE", "queue": "send-qr-email" }
    ],
    "consumers": [
      { "queue": "send-qr-email", "max_batch_size": 10 }
    ]
  },

  // Email Service — native sending binding (public beta)
  "send_email": [
    { "name": "EMAIL" }
  ]
}
```

---

## Data Models

### D1 Schema (Drizzle)

```ts
// tournaments table
export const tournaments = sqliteTable('tournaments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  photo_url: text('photo_url'),
  registration_limit: integer('registration_limit'),       // null = unlimited
  registration_open_at: integer('registration_open_at', { mode: 'timestamp' }).notNull(),
  registration_close_at: integer('registration_close_at', { mode: 'timestamp' }).notNull(),
  checkin_open_at: integer('checkin_open_at', { mode: 'timestamp' }).notNull(),
  checkin_close_at: integer('checkin_close_at', { mode: 'timestamp' }).notNull(),
  email_template_html: text('email_template_html'),
  // Hashed passwords per role, stored as JSON string
  passwords_json: text('passwords_json').notNull().default('{}'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// registrations table — unified, type-discriminated
export const registrations = sqliteTable('registrations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tournament_id: text('tournament_id').notNull().references(() => tournaments.id),
  type: text('type', { enum: ['competitor', 'attendee'] }).notNull(),
  email: text('email').notNull(),
  data_json: text('data_json').notNull(),                  // all form fields as JSON
  qr_code_token: text('qr_code_token').notNull().unique().$defaultFn(() => crypto.randomUUID()),
  checked_in: integer('checked_in', { mode: 'boolean' }).default(false),
  checked_in_at: integer('checked_in_at', { mode: 'timestamp' }),
  checked_in_by: text('checked_in_by'),
  submitted_at: integer('submitted_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
```

### TypeScript Types

```ts
type Tournament = {
  id: string
  name: string
  slug: string
  photo_url: string | null
  registration_limit: number | null       // จำกัดจำนวนการลงทะเบียน
  registration_open_at: Date              // วันที่เปิดลงทะเบียน
  registration_close_at: Date             // วันที่ปิดลงทะเบียน
  checkin_open_at: Date                   // วันที่เช็คอินได้
  checkin_close_at: Date                  // วันที่สิ้นสุดการเช็คอิน
  email_template_html: string | null
  passwords: {
    assistant: string    // bcrypt hash
    admin: string        // bcrypt hash
    super_admin: string  // bcrypt hash
  }
  created_at: Date
  updated_at: Date
}

type CompetitorData = {
  // Personal
  gender: 'male' | 'female'
  full_name_th: string
  full_name_en: string
  nickname_th: string
  nickname_en: string
  age: string
  academic_year: string
  school: string
  phone: string
  golf_experience_years: string
  preferred_date: 'both_with_beat' | 'both_no_beat' | 'sat_with_beat' | 'sat_only' | 'sun_only'
  want_certificate: boolean
  // Beat the Pro — R2 object keys (not full URLs)
  applicant_photo_keys: string[]      // up to 2
  intro_video_key: string
  golf_swing_video_key: string
  tournament_result_1: string
  tournament_result_2: string
  tournament_result_3: string
  official_scoreboard_key: string
  // PDPA
  consent_personal_id: boolean
  consent_contact_info: boolean
  consent_photo_video: boolean
  consent_third_party: boolean
  consent_international_transfer: boolean
  consent_data_retention: boolean
  acknowledge_privacy_policy: boolean
}

type AttendeeData = {
  gender: 'male' | 'female'
  full_name_th: string
  full_name_en: string
  nickname_th: string
  nickname_en: string
  age: string
  phone: string
  organization: string                // หน่วยงาน / องค์กร
  preferred_date: string
  want_certificate: boolean
  // PDPA (same fields as competitor)
  consent_personal_id: boolean
  consent_contact_info: boolean
  consent_photo_video: boolean
  consent_third_party: boolean
  consent_international_transfer: boolean
  consent_data_retention: boolean
  acknowledge_privacy_policy: boolean
}
```

---

## Role & Session System

No login system. Password-per-tournament-per-role. Verified server-side on every sensitive action.

| Role | Permissions |
|------|-------------|
| `assistant` | QR scanner + check-in only |
| `admin` | Dashboard read-only (registrant list + stats) + QR scanner |
| `super_admin` | Everything: CRUD tournament, settings, passwords, export CSV |

**Session flow:**
1. User POSTs password to `/api/auth/[slug]`
2. Server compares bcrypt hash against `tournament.passwords[role]` in D1
3. On match: generate a random session token, store `{ role, tournamentId }` in **KV** with 8h TTL
4. Return token in `Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Strict`
5. All admin API routes verify cookie → KV lookup → get role → authorize

> **Why KV instead of sessionStorage?** Workers are stateless — sessionStorage is browser-only. KV gives server-side session verification across all Workers instances globally.

---

## Pages & Routes

### Public

| Route | Description |
|-------|-------------|
| `/[slug]/register/competitor` | Multi-step registration form — ผู้เข้าแข่งขัน |
| `/[slug]/register/attendee` | Registration form — ผู้เข้าร่วมงาน |

### Admin

| Route | Description |
|-------|-------------|
| `/admin` | Tournament list (super_admin only) |
| `/admin/[slug]` | Dashboard: stats, registrant list, live check-in feed |
| `/admin/[slug]/settings` | Edit tournament + passwords |
| `/admin/[slug]/checkin` | QR scanner |

### API Routes (Workers)

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/[slug]` | POST | — | Verify password → set session cookie |
| `/api/auth/logout` | POST | session | Clear session |
| `/api/register/[slug]/competitor` | POST | — | Submit competitor form + enqueue email |
| `/api/register/[slug]/attendee` | POST | — | Submit attendee form + enqueue email |
| `/api/checkin/[slug]` | POST | session (assistant+) | Mark check-in by QR token |
| `/api/admin/[slug]/registrants` | GET | session (admin+) | Paginated registrant list |
| `/api/admin/[slug]/stats` | GET | session (admin+) | Aggregate counts |
| `/api/admin/[slug]/export` | GET | session (super_admin) | Stream CSV download |
| `/api/admin/[slug]/tournament` | PUT | session (super_admin) | Update tournament settings |
| `/api/admin/tournaments` | POST | session (super_admin) | Create new tournament |
| `/api/ws/[slug]` | WS | session (admin+) | WebSocket → Durable Object room |

---

## Real-time Architecture (Durable Objects)

```
Admin Browser
    │
    │ WebSocket upgrade to /api/ws/[slug]
    ▼
Cloudflare Worker
    │
    │ env.TOURNAMENT_ROOM.get(idFromName(slug))
    ▼
TournamentRoom Durable Object  ←──── receives broadcast from QR scan Worker
    │
    │ hibernates when no clients connected (cost = $0)
    │ wakes on WebSocket message or external fetch
    │
    └─── broadcasts JSON event to all connected admin tabs:
         { type: 'checkin', name, registration_type, checked_in_at }
         { type: 'stats',   total, checked_in, competitors, attendees }
```

**TournamentRoom DO (pseudocode):**
```ts
export class TournamentRoom implements DurableObject {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      this.state.acceptWebSocket(pair[1])   // hibernation API
      return new Response(null, { status: 101, webSocket: pair[0] })
    }
    // POST from QR scan Worker → broadcast to all open WS
    const event = await request.json()
    for (const ws of this.state.getWebSockets()) {
      ws.send(JSON.stringify(event))
    }
    return new Response('ok')
  }

  webSocketMessage(ws: WebSocket, message: string) {}
  webSocketClose(ws: WebSocket) {}
}
```

**QR Scan Worker action (after D1 update):**
```ts
// After marking check-in in D1, notify the DO room
const roomId = env.TOURNAMENT_ROOM.idFromName(slug)
const room = env.TOURNAMENT_ROOM.get(roomId)
await room.fetch('https://internal/broadcast', {
  method: 'POST',
  body: JSON.stringify({ type: 'checkin', name, registration_type, checked_in_at })
})
```

---

## File Upload Architecture (R2)

**Upload flow:**
1. Client requests a **presigned R2 upload URL** from `/api/upload/presign` (Workers generate it via `env.BUCKET.createPresignedUrl()`)
2. Client uploads directly to R2 (bypasses Workers — no CPU/bandwidth cost on Worker)
3. Client sends the R2 **object key** (not URL) in the registration form submission
4. Server stores object key in `data_json`. URLs are generated at read time via R2 public domain.

**R2 Bucket structure:**
```
tournament-uploads/
  {tournament_id}/
    {registration_id}/
      photos/
        photo_1.jpg
        photo_2.jpg
      videos/
        intro.mp4
        swing.mp4
      documents/
        scoreboard.pdf
```

**Access:** Serve files via R2 custom domain (e.g. `files.yourdomain.com`). Configure in Cloudflare dashboard: R2 bucket → Settings → Custom Domain.

---

## Email Architecture (Cloudflare Email Service + Queues)

**Why Queues?** File uploads and DB write happen first synchronously. Email is pushed to a Queue so the registration response is instant (~50ms). The consumer Worker sends the email asynchronously.

**Send flow:**
```
Registration API (Worker)
  → Write to D1
  → env.EMAIL_QUEUE.send({ registrationId, tournamentId })
  → Return 200 to user immediately

Queue Consumer Worker (triggered async)
  → Fetch registration from D1
  → Fetch tournament email_template_html from D1
  → Generate QR code PNG (qrcode npm)
  → Upload QR PNG to R2 (key: qrcodes/{registrationId}.png)
  → Replace template variables in HTML
  → env.EMAIL.send({ to, from, subject, html })
```

**Cloudflare Email Service binding usage:**
```ts
await env.EMAIL.send({
  to: [{ email: registrant.email, name: registrant.full_name_th }],
  from: { email: 'noreply@yourdomain.com', name: 'Tournament System' },
  subject: `[${tournament.name}] QR Code สำหรับเช็คอิน`,
  html: renderedHtml,
})
```

> **Note:** Cloudflare Email Service is in public beta as of May 2026. If binding is unavailable, fall back to **Resend** (`fetch('https://api.resend.com/emails', ...)`) using a secret stored in Workers Secrets.

---

## Feature Specifications

### 1. Tournament CRUD (Super Admin)

- Create/edit/delete tournaments
- Fields: name, slug (auto-from name, editable), photo (→ R2), registration limit, open/close dates for registration + check-in, custom email template HTML
- Passwords (assistant / admin / super_admin) set per tournament — stored as bcrypt hashes
- Slug is the primary key for all public URLs

### 2. Public Registration — Competitor (`/[slug]/register/competitor`)

Multi-step form (3 steps, progress indicator):

**Step 1 — ข้อมูลส่วนตัว**
- เพศ — radio: ชาย / หญิง
- ชื่อ-นามสกุล (ไทย), Full Name (English) — text
- ชื่อเล่น (ไทย), Nickname (English) — text
- อายุ, ชั้นปีการศึกษา, โรงเรียน — text
- หมายเลขโทรศัพท์ — tel; อีเมล — email *(QR destination)*
- มีประสบการณ์เล่นกอล์ฟมาแล้วกี่ปี — text
- เลือกวันที่ — radio group (5 options)
- ต้องการรับใบประกาศนียบัตร — radio Yes/No

**Step 2 — Beat the Pro**
- รูปถ่ายผู้สมัคร — file (1–2 images ≤5MB each; note: ถ่ายภายใน 6 เดือน)
- คลิปแนะนำตัว — file (video 60–120 วินาที ≤100MB)
- วิดีโอสวิงกอล์ฟ — file (video ≤3 นาที ≤100MB)
- ผลการแข่งขัน 1/2/3 — textarea
- แนบผลคะแนนอย่างเป็นทางการ — file upload
- All files: presign R2 URL → upload direct → store key

**Step 3 — PDPA Consent**
- 6 consent items (radio ยินยอม/ไม่ยินยอม each)
- Privacy Policy checkbox (required)

On submit:
1. Validate all fields; check registration window + limit (D1 query)
2. POST to `/api/register/[slug]/competitor`
3. Worker: insert to D1, enqueue email job
4. Redirect to `/[slug]/register/success?id={id}` — show QR code (fetch from R2 after email worker generates it, or generate inline)

### 3. Public Registration — Attendee (`/[slug]/register/attendee`)

2-step form:

**Step 1 — ข้อมูลส่วนตัว**
- เพศ — radio; ชื่อ-นามสกุล (TH/EN); ชื่อเล่น (TH/EN)
- อายุ; หมายเลขโทรศัพท์; อีเมล
- หน่วยงาน / องค์กร — text
- วันที่ต้องการเข้าร่วม — select/radio
- ต้องการรับใบประกาศนียบัตร — radio Yes/No

**Step 2 — PDPA Consent** (same as competitor)

On submit: same validation + D1 insert + email queue flow

### 4. Admin Dashboard (`/admin/[slug]`)

**Stats Panel (real-time)**
- Competitor registered / checked-in
- Attendee registered / checked-in
- Total progress bar
- Live via WebSocket → Durable Object

**Registrant Table**
- Columns: ชื่อ, ประเภท, อีเมล, วันที่สมัคร, สถานะ Check-in, checked_in_at
- Filters: ประเภท, สถานะ, วันที่
- Search: ชื่อ / เบอร์โทร
- Paginated API: `/api/admin/[slug]/registrants?page=1&type=competitor&checked_in=false`
- Row click: modal with full `data_json` rendered as readable form
- Export CSV (super_admin only)

**Live Check-in Feed**
- WebSocket connection to TournamentRoom DO
- Incoming `checkin` events render as animated rows: name, type, time
- Shows last 20 check-ins

### 5. QR Scanner (`/admin/[slug]/checkin`)

- Mobile-first, full-screen camera view
- `html5-qrcode` scanning `qr_code_token`
- On scan → POST `/api/checkin/[slug]` with `{ token }`
- Worker: look up D1 by token, validate window, update `checked_in`, broadcast to DO
- UI feedback overlay:
  - ✅ Green: ชื่อ + ประเภท + เช็คอินสำเร็จ
  - ⚠️ Yellow: เช็คอินแล้ว (เวลาเดิม)
  - ❌ Red: ไม่พบ QR นี้
  - 🕒 Orange: ยังไม่ถึงเวลาเช็คอิน / หมดเวลาแล้ว
- Auto-resume scan after 2s

### 6. CSV Export

```ts
// GET /api/admin/[slug]/export
// Returns: attachment; filename="[slug]-registrants-YYYY-MM-DD.csv"
// Columns:
// id, type, full_name_th, full_name_en, nickname_th, gender, age,
// school_or_org, phone, email, preferred_date, want_certificate,
// consent_personal_id, consent_contact_info, consent_photo_video,
// consent_third_party, consent_international_transfer,
// consent_data_retention, acknowledge_privacy_policy,
// submitted_at, checked_in, checked_in_at, checked_in_by
```

---

## Email Template System

Each tournament stores a raw `email_template_html` string. At send time, the Queue consumer Worker performs simple string replacement:

| Variable | Value |
|---|---|
| `{{registrant_name}}` | full_name_th |
| `{{tournament_name}}` | tournament.name |
| `{{registration_type}}` | ผู้เข้าแข่งขัน / ผู้เข้าร่วมงาน |
| `{{preferred_date}}` | Selected date label |
| `{{checkin_open_date}}` | Formatted in Asia/Bangkok TZ |
| `{{checkin_close_date}}` | Formatted in Asia/Bangkok TZ |
| `{{qr_code_image}}` | `<img src="https://files.yourdomain.com/qrcodes/{id}.png">` |
| `{{submission_id}}` | registration.id |

Super Admin edits template in tournament settings via `<textarea>` with a "Preview" button.

---

## Validation & Edge Cases

- Registration outside window → Thai error message: "การลงทะเบียนยังไม่เปิด / ปิดแล้ว"
- Limit reached → "ขออภัย ที่นั่งเต็มแล้ว"
- Duplicate email → allow (same person, different day)
- File size exceeded → validate client-side before presign request (photos ≤5MB, videos ≤100MB)
- QR token is UUID v4, never in URL params, only in QR image
- All timestamps: stored as Unix epoch integers in D1 (SQLite has no native timestamp); display in `Asia/Bangkok` TZ using `Intl.DateTimeFormat`
- D1 concurrent write for check-in: use `UPDATE ... WHERE checked_in = 0` to prevent double check-in race

---

## Folder Structure

```
/app
  /[slug]
    /register
      /competitor/page.tsx
      /attendee/page.tsx
      /success/page.tsx
  /admin
    /page.tsx
    /[slug]
      /page.tsx
      /settings/page.tsx
      /checkin/page.tsx
/workers
  /tournament-room.ts       — Durable Object class
  /email-consumer.ts        — Queue consumer for email sending
/lib
  /db.ts                    — Drizzle D1 client
  /r2.ts                    — R2 helpers (presign, get URL)
  /kv-session.ts            — KV session create/verify/destroy
  /email.ts                 — Email Service binding wrapper
  /qrcode.ts                — QR PNG generation
  /csv.ts                   — CSV stream builder
  /auth.ts                  — bcrypt password verify
  /realtime.ts              — DO room broadcast helper
/components
  /forms
    CompetitorForm.tsx
    AttendeeForm.tsx
    PDPASection.tsx
    FileUploadField.tsx      — handles presign → direct R2 upload
  /admin
    StatsPanel.tsx
    RegistrantTable.tsx
    CheckinFeed.tsx          — WebSocket consumer
    QRScanner.tsx
  /ui                        — shadcn components
/types
  bindings.d.ts              — Env interface (DB, BUCKET, SESSIONS, TOURNAMENT_ROOM, EMAIL_QUEUE, EMAIL)
  tournament.ts
  registration.ts
wrangler.jsonc
drizzle.config.ts
```

---

## Local Development

```bash
# 1. Install
npm create cloudflare@latest -- tournament-app --framework=next --platform=workers

# 2. Create services
wrangler d1 create tournament-db
wrangler r2 bucket create tournament-uploads
wrangler kv namespace create SESSIONS
wrangler queues create send-qr-email

# 3. Apply D1 schema
wrangler d1 execute tournament-db --local --file=./drizzle/schema.sql

# 4. Set secrets (local via .dev.vars)
# .dev.vars (gitignored):
# BCRYPT_SEED_SECRET=...
# RESEND_API_KEY=...  (email fallback)

# 5. Dev server (emulates all bindings via Miniflare)
wrangler dev
```

---

## Deployment

```bash
# Production deploy
wrangler deploy

# Set production secrets
wrangler secret put RESEND_API_KEY

# Run D1 migration in production
wrangler d1 execute tournament-db --remote --file=./drizzle/schema.sql
```

---

## Implementation Notes

1. **`@opennextjs/cloudflare`**: All Next.js Server Actions, API Routes, and RSC run as Workers. Access D1/R2/KV/DO via `getRequestContext().env` from `@opennextjs/cloudflare`.
2. **bcrypt in Workers**: Use `bcryptjs` (pure JS, no native addons) — compatible with Workers' Node.js compat layer.
3. **QR PNG generation**: `qrcode` package works in Workers with `nodejs_compat` flag. Generate buffer, upload to R2 as `image/png`.
4. **WebSocket on client**: Use native browser `WebSocket` pointing to `/api/ws/[slug]`. Include session cookie automatically.
5. **D1 check-in atomicity**: `UPDATE registrations SET checked_in=1, checked_in_at=? WHERE qr_code_token=? AND checked_in=0` — returns `meta.changes` to detect race conditions.
6. **R2 presigned URLs**: Valid for 1 hour. Generate server-side in `/api/upload/presign` route, return to client, client uploads directly. This keeps large video files off Workers' CPU limits.
7. **DO hibernation**: Use `state.acceptWebSocket()` (not manual WebSocket pair management) to enable hibernation — Durable Object sleeps when all admins disconnect, costing nothing.
8. **Thai timezone**: `new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })` for display. Store raw UTC epoch in D1.
