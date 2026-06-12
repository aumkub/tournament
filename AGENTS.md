# Tournament Registration & Check-in System — Project Prompt

## Project Overview

Build a full-stack **Tournament Registration & Check-in Management System** for event organizers. The system supports **dynamic, configurable registration forms** via a form config system and a role-gated admin dashboard with real-time check-in tracking, QR code scanning, and CSV export.

**Deployment target: 100% Cloudflare stack.** Every service must use a Cloudflare product. No Supabase, no Vercel, no AWS.

**Framework: React Router 7** (not Next.js) with `@cloudflare/vite-plugin` adapter for Workers deployment.

---

## Infrastructure: Cloudflare Service Map

Each feature is mapped to the correct Cloudflare product. Use the table below as the authoritative reference throughout implementation.

| Feature | Cloudflare Service | Notes |
|---|---|---|
| **Frontend + SSR** | **Cloudflare Workers** (via React Router 7) | Deploy React Router 7 on Workers. Use `npm create cloudflare@latest -- --framework=react-router`. Entry point: `workers/app.ts` which exports `TournamentRoom` DO. |
| **Primary Database** | **Cloudflare D1** (SQLite at the edge) | All structured data: tournaments, registrations, check-ins. Access via Workers binding `env.DB`. Use Drizzle ORM or `@cloudflare/d1` driver directly. |
| **File Storage** | **Cloudflare R2** | Store uploaded files: applicant photos, intro videos, golf swing videos, official scoreboard files. Access via Workers binding `env.BUCKET`. Serve via public R2 custom domain. |
| **Real-time (Check-in feed + Stats)** | **Cloudflare Durable Objects** + WebSocket | One Durable Object per tournament (`TournamentRoom`). Admin dashboard opens a WebSocket to the DO. When a QR scan check-in happens, the Worker writes to D1 then broadcasts the event to all connected admin dashboards via the DO. Use Hibernation WebSocket API to reduce cost. |
| **Session / Role Cache** | **Cloudflare KV** | Store hashed role tokens per session (short TTL: 8h). Key: `session:{token}` → `{ role, tournamentId }`. Stateless Workers validate session by KV lookup. |
| **Email (QR Code delivery)** | **Resend API** | Sends transactional emails via HTTP fetch. API key stored in Workers Secrets. QR codes generated on-demand using `qrcode-generator` npm package. |
| **Static Assets (images, CSS, JS)** | **Cloudflare Workers Assets** | Bundled automatically by React Router build. CDN-cached globally at 300+ PoPs. |
| **DNS & Domain** | **Cloudflare DNS** | Manage all DNS records. Custom domain for R2 bucket (file delivery). |
| **Secrets Management** | **Cloudflare Workers Secrets** (via `wrangler secret put`) | Store sensitive values: Resend API key. Never in `.env` committed to git. |
| **CI/CD** | **Cloudflare Workers CI** (GitHub Actions + `wrangler deploy`) | On push to `main` → run `wrangler deploy`. Preview deployments on PR branches. |

---

## Tech Stack

- **Framework**: React Router 7, TypeScript
- **Cloudflare Adapter**: `@cloudflare/vite-plugin` + `@react-router/dev` — Workers deployment
- **UI Components**: daisyui + shadcn — follow `DESIGN.md`
- **ORM**: Drizzle ORM with `drizzle-orm/d1` dialect
- **QR Code Gen**: `qrcode-generator` npm package (client-side SVG generation)
- **QR Code Scan**: `html5-qrcode` (client-side, camera API)
- **CSV Export**: `papaparse`
- **Local Dev**: `wrangler dev` with `.dev.vars` for secrets; Miniflare emulates D1, R2, KV, DO locally
- **Password Hashing**: Web Crypto API PBKDF2 (no bcrypt dependency needed)
- **Forms**: Dynamic form config system (`lib/form-configs/`) with TypeScript-defined field types

---

## Design System

All components must follow `DESIGN.md` conventions. The design uses:
- **daisyui** + **Tailwind CSS** for styling
- **Anthropic-inspired warm cream + coral aesthetic** (#faf9f5 canvas, #cc785c primary)
- **Copernicus/Tiempos Headline serif** for display headlines with negative letter-spacing
- **Inter/StyreneB sans** for body text

Admin UI should feel clean and dashboard-like (data-dense, functional). Public registration pages should feel polished and welcoming.

---

## Cloudflare Bindings (`wrangler.json`)

```jsonc
{
  "name": "tournament",
  "main": "./workers/app.ts",
  "compatibility_date": "2025-10-08",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "upload_source_maps": true,

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
    {
      "tag": "v1",
      "new_classes": ["TournamentRoom"]
    }
  ],

  // Queues — producer only (consumer NOT configured)
  "queues": {
    "producers": [
      {
        "binding": "EMAIL_QUEUE",
        "queue": "send-qr-email"
      }
    ]
  }
}
```

**Note**: Email queue consumer is not configured. Emails are sent directly via Resend API. The `EMAIL_QUEUE` binding exists for potential future use.

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

// registrations table — unified, flexible type (no enum constraint)
export const registrations = sqliteTable('registrations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tournament_id: text('tournament_id').notNull().references(() => tournaments.id),
  type: text('type').notNull(),                          // form config ID (e.g., 'competitor', 'attendee', 'youth')
  email: text('email').notNull(),
  data_json: text('data_json').notNull(),               // all form fields as JSON
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
  competitor_url: string | null
  attendee_url: string | null
  competitor_title_en: string | null
  attendee_title_en: string | null
  competitor_form_id: string | null      // form config ID for competitor
  attendee_form_id: string | null        // form config ID for attendee
  registration_limit: number | null       // จำกัดจำนวนการลงทะเบียนทั้งหมด
  competitor_limit: number | null        // จำกัดจำนวน competitor เฉพาะ
  attendee_limit: number | null          // จำกัดจำนวน attendee เฉพาะ
  registration_open_at: Date              // วันที่เปิดลงทะเบียน
  registration_close_at: Date             // วันที่ปิดลงทะเบียน
  checkin_open_at: Date                   // วันที่เช็คอินได้
  checkin_close_at: Date                  // วันที่สิ้นสุดการเช็คอิน
  email_template_html: string | null      // DEPRECATED — use email_templates_json
  email_templates_json: string            // { "formId": "<html>" } per form type
  form_urls_json: string                  // { "formId": "url-slug" } dynamic URLs
  test_mode: boolean                      // เปิดโหมดทดสอบ
  passwords: {
    assistant: string    // PBKDF2 hash
    admin: string        // PBKDF2 hash
    super_admin: string  // PBKDF2 hash
  }
  created_at: Date
  updated_at: Date
}

// Form data is now dynamic — defined by FormConfig in lib/form-configs/
// Each form config defines its own fields and their types

// Current form configs:
// - attendee: Dynamic spectator/attendee form
// - youth: Youth competition form with Beat the Pro section

// Each registration stores: { [fieldKey]: fieldValue } in data_json
// Field types: text, email, tel, date, number, select, multiselect, radio, checkbox, file, textarea, url

// See types/form-config.ts for FormConfig interface
// See lib/form-configs/ for available form definitions
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
2. Server verifies PBKDF2 hash against `tournament.passwords[role]` in D1 using `lib/auth.ts`
3. On match: generate a random session token (UUID v4), store `{ role, tournamentId }` in **KV** with 8h TTL
4. Return token in `Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Strict`
5. All admin API routes verify cookie → KV lookup → get role → authorize

> **Why KV instead of sessionStorage?** Workers are stateless — sessionStorage is browser-only. KV gives server-side session verification across all Workers instances globally.

---

## Pages & Routes

### Public

| Route | Description |
|-------|-------------|
| `/` | Tournament homepage / welcome page |
| `/[slug]` | Redirects to default registration type (via `default_form_id` or first form URL) |
| `/[slug]/register/:type` | Dynamic registration form by form config ID (e.g., `/slug/register/youth`) |
| `/[slug]/register/success` | Success page with QR code after registration |

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
| `/api/register/[slug]/form` | GET | — | Get form config JSON for given slug/type |
| `/api/register/[slug]/form` | POST | — | Submit dynamic form + send email directly |
| `/api/upload` | POST | — | Generate presigned R2 upload URL |
| `/api/file` | GET | — | Serve file from R2 (proxied via Worker) |
| `/api/checkin/[slug]` | POST | session (assistant+) | Mark check-in by QR token |
| `/api/admin/[slug]/registrants` | GET | session (admin+) | Paginated registrant list |
| `/api/admin/[slug]/registrants/:id` | DELETE | session (super_admin) | Delete a registration |
| `/api/admin/[slug]/stats` | GET | session (admin+) | Aggregate counts |
| `/api/admin/[slug]/export` | GET | session (super_admin) | Stream CSV download |
| `/api/admin/[slug]/tournament` | PUT | session (super_admin) | Update tournament settings |
| `/api/admin/tournaments` | GET | session (super_admin) | List all tournaments |
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

## Email Architecture (Resend API)

**Send flow (synchronous, no queue):**
```
Registration API (Worker)
  → Write to D1
  → Select email template based on registration.type
  → Generate QR code SVG (client-side via qrcode-generator)
  → Replace template variables in HTML
  → POST to Resend API
  → Return 200 to user
```

**Resend API usage:**
```ts
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'noreply@yourdomain.com',
    to: registrant.email,
    subject: `[${tournament.name}] QR Code สำหรับเช็คอิน`,
    html: renderedHtml,
  }),
});
```

**Email templates**: Stored in `lib/email-templates/`. Each template function accepts variables and returns HTML. QR code embedded as inline SVG (no R2 upload needed).

---

## Feature Specifications

### 1. Tournament CRUD (Super Admin)

- Create/edit/delete tournaments
- Fields: name, slug (auto-generated from name, editable), photo (→ R2), registration limit, per-type limits, open/close dates for registration + check-in, email templates per form, form URL mappings, test mode
- Passwords (assistant / admin / super_admin) set per tournament — stored as PBKDF2 hashes
- Slug is the primary key for all public URLs
- Form configs: Map form IDs to URL slugs via `form_urls_json` (e.g., `{ "youth": "youth-comp", "attendee": "spectator" }`)

### 2. Dynamic Registration Forms (`/[slug]/register/:type`)

Forms are defined in `lib/form-configs/` with TypeScript config. Each form has:
- `id`: Unique identifier (e.g., 'youth', 'attendee')
- `label`: { th, en } display names
- `defaultUrlSlug`: Default URL slug for this form
- `steps`: Array of step configs with fields
- `emailField`: Key of field containing email address

**Field types**: `text`, `email`, `tel`, `date`, `number`, `select`, `multiselect`, `radio`, `checkbox`, `file`, `textarea`, `url`

**Example built-in forms**:
- **youth**: Multi-step form with personal info, Beat the Pro (photos, videos), PDPA
- **attendee**: Simple spectator/attendee form

**Form URL mapping**: `tournament.form_urls_json` stores custom URL slugs per form ID. Format: `{ "formId": "url-slug" }`

On submit:
1. Validate all fields against form config; check registration window + limit (D1 query)
2. POST to `/api/register/[slug]/form` with `{ formId, data: { [key]: value } }`
3. Worker: insert to D1, generate QR code, send email directly via Resend API
4. Redirect to `/[slug]/register/success?id={id}` — show QR code (generated client-side with `qrcode-generator`)

### 4. Admin Dashboard (`/admin/[slug]`)

**Stats Panel (real-time)**
- Registered/checked-in counts per form type (dynamic based on forms configured)
- Total progress bar
- Live via WebSocket → Durable Object

**Registrant Table**
- Columns: Dynamic based on form config (name, email, form type, submitted_at, checked_in, checked_in_at)
- Filters: Form type, check-in status, date range
- Search: Name / phone / email
- Paginated API: `/api/admin/[slug]/registrants?page=1&type=youth&checked_in=false`
- Row click: modal with full `data_json` rendered as readable form
- Delete registration (super_admin only)
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
// Columns are dynamic based on form config fields + system fields:
// id, type, email, [form fields...], submitted_at, checked_in, checked_in_at, checked_in_by
```

---

## Email Template System

Each tournament stores `email_templates_json`: `{ "formId": "<html_body>" }` mapping per form type.

Email templates are defined in `lib/email-templates/` with named functions returning HTML:
- `getYouthEmailTemplate(vars)`: For youth competition form
- `getAttendeeEmailTemplate(vars)`: For attendee form
- `getCompetitorEmailTemplate(vars)`: For competitor form (deprecated)

**Template variables**:

| Variable | Value |
|---|---|
| `{{registrant_name}}` | Full name from form |
| `{{tournament_name}}` | tournament.name |
| `{{registration_type}}` | Form label (TH) |
| `{{preferred_date}}` | Selected date label |
| `{{checkin_open_date}}` | Formatted in Asia/Bangkok TZ |
| `{{checkin_close_date}}` | Formatted in Asia/Bangkok TZ |
| `{{qr_code_image}}` | SVG QR code inline (generated by `qrcode-generator`) |
| `{{submission_id}}` | registration.id |

**Email sending flow** (no queues):
1. After registration insert, Worker generates QR code SVG inline
2. Worker selects email template based on `registration.type`
3. Worker sends email via Resend API: `fetch('https://api.resend.com/emails', ...)`

Super Admin can override templates in tournament settings per form type.

---

## Validation & Edge Cases

- Registration outside window → Thai error message: "การลงทะเบียนยังไม่เปิด / ปิดแล้ว"
- Limit reached → "ขออภัย ที่นั่งเต็มแล้ว" (checks `registration_limit`, `competitor_limit`, `attendee_limit`)
- Duplicate email → allow (same person can register for different forms/days)
- File size exceeded → validate client-side before presign request (photos ≤5MB, videos ≤100MB)
- Test mode → if `tournament.test_mode = true`, allows registration outside window for testing
- QR token is UUID v4, never in URL params, only in QR code
- All timestamps: stored as Unix epoch integers in D1 (SQLite has no native timestamp); display in `Asia/Bangkok` TZ using `Intl.DateTimeFormat`
- D1 concurrent write for check-in: use `UPDATE ... WHERE checked_in = 0` to prevent double check-in race
- Form validation → validates against `FormConfig` schema (required fields, types, options)

---

## Folder Structure

```
/app
  /routes.ts                — React Router route config
  /routes/
    /home.tsx                — Tournament homepage
    /register/
      register.tsx           — Dynamic form renderer
      success.tsx            — Success page with QR code
    /admin/
      index.tsx              — Tournament list
      dashboard.tsx          — Admin dashboard
      settings.tsx           — Tournament settings
      checkin.tsx            — QR scanner
    /api/
      /auth.ts               — Password verification
      /logout.ts             — Session clear
      /upload.ts             — R2 presign URL generation
      /file.ts               — R2 file proxy
      /checkin.ts            — QR check-in endpoint
      /ws.ts                 — WebSocket upgrade to DO
      /register-form.ts      — Dynamic form config API
      /register-competitor.ts — Legacy competitor submit
      /register-attendee.ts   — Legacy attendee submit
      /admin/
        tournaments.ts       — CRUD tournaments
        registrants.ts        — List/filter/registrants
        registrant-delete.ts  — Delete registration
        stats.ts              — Statistics
        export.ts             — CSV export
        tournament.ts         — Update single tournament
/workers
  /app.ts                   — Main Worker entry, exports TournamentRoom
  /tournament-room.ts       — Durable Object class
  /email-consumer.ts        — Email queue consumer (NOT USED - emails sent directly)
/lib
  /db/
    index.ts                — Drizzle D1 client factory
    schema.ts               — D1 schema definitions
  /r2.ts                    — R2 helpers (presign, get URL)
  /kv-session.ts            — KV session create/verify/destroy
  /email.ts                 — Email sending (Resend API wrapper)
  /qrcode.ts                — QR SVG generation
  /csv.ts                   — CSV stream builder
  /auth.ts                  — PBKDF2 password verify (Web Crypto API)
  /realtime.ts              — DO room broadcast helper
  /utils.ts                 — Utility functions
  /form-configs/            — Dynamic form definitions
    /index.ts                — Form config registry
    /attendee-dynamic.ts     — Attendee form config
    /youth.ts                — Youth competition form config
    /shared-options.ts       — Shared field options (provinces, etc.)
    /thai-provinces.ts       — Thai provinces data
  /email-templates/          — Email templates
    /index.ts                — Template registry
    /attendee.ts             — Attendee email template
    /youth.ts                — Youth email template
    /competitor.ts           — Competitor email template (deprecated)
/components
  /forms/
    DynamicForm.tsx          — Form renderer from config
    FileUploadField.tsx      — R2 upload with presign
  /admin/
    StatsPanel.tsx           — Real-time stats
    RegistrantTable.tsx      — Registrant list with filters
    CheckinFeed.tsx          — WebSocket live feed
    QRScanner.tsx            — QR code scanner
  /ui                        — UI components (shadcn primitives)
/types
  bindings.d.ts              — Env interface (DB, BUCKET, SESSIONS, TOURNAMENT_ROOM, EMAIL_QUEUE)
  form-config.ts            — Form config TypeScript types
  registration.ts           — Registration data types
  tournament.ts             — Tournament data types
/drizzle/
  /0001_initial.sql          — Initial schema
  /0002_registration_urls.sql
  /0003_type_limits.sql
  /0004_registration_titles.sql
  /0005_flexible_forms.sql   — Dynamic forms support
  /0006_registration_titles_en.sql
  /0007_remove_default_form_id.sql
  /0008_test_mode.sql
  /0009_email_templates.sql   — Per-form email templates
  /0010_registration_type_forms.sql
wrangler.json
drizzle.config.ts
react-router.config.ts
```

---

## Local Development

```bash
# 1. Dev server (React Router + Wrangler)
npm run dev

# Or with Wrangler directly
wrangler dev

# 2. Create Cloudflare services (first time setup)
wrangler d1 create tournament-db
wrangler r2 bucket create tournament-uploads
wrangler kv namespace create SESSIONS
wrangler queues create send-qr-email

# 3. Apply D1 migrations locally
# IMPORTANT: After adding/modifying .sql files, always run:
wrangler d1 execute tournament-db --local --file=drizzle/<filename>.sql

# Or apply all migrations:
for file in drizzle/*.sql; do wrangler d1 execute tournament-db --local --file="$file"; done

# 4. Set secrets (local via .dev.vars)
# .dev.vars (gitignored):
# RESEND_API_KEY=re_...
# SUPER_ADMIN_PASSWORD=...
```

**See `CLAUDE.md` for migration rule:** Always run local migrate after modifying `.sql` files.

---

## Deployment

```bash
# Production deploy
npm run deploy
# or
wrangler deploy

# Set production secrets
wrangler secret put RESEND_API_KEY
wrangler secret put SUPER_ADMIN_PASSWORD

# Run D1 migrations in production
for file in drizzle/*.sql; do wrangler d1 execute tournament-db --remote --file="$file"; done
```

---

## Implementation Notes

1. **React Router 7 on Workers**: Access Cloudflare bindings via `context.cloudflare.env` in loaders and actions. The `workers/app.ts` file exports the main Worker handler and the `TournamentRoom` Durable Object class.
2. **Password hashing**: Uses Web Crypto API PBKDF2 (`lib/auth.ts`) — no bcrypt dependency. Hash format: `iterations$saltHex$hashHex`. Fully compatible with Workers runtime.
3. **QR Code generation**: `qrcode-generator` package generates SVG QR codes on client-side. SVG embedded directly in email HTML — no R2 upload needed.
4. **Email sending**: Sends directly via Resend API (`fetch('https://api.resend.com/emails', ...)`) after registration. No queue consumer — email sent synchronously (but fast due to API call).
5. **Dynamic forms**: Form configs are TypeScript objects in `lib/form-configs/`. The form renderer (`components/forms/DynamicForm.tsx`) builds UI from config at runtime.
6. **WebSocket on client**: Use native browser `WebSocket` pointing to `/api/ws/[slug]`. Session cookie included automatically.
7. **D1 check-in atomicity**: `UPDATE registrations SET checked_in=1, checked_in_at=? WHERE qr_code_token=? AND checked_in=0` — returns `meta.changes` to detect race conditions.
8. **R2 presigned URLs**: Valid for 1 hour. Generate server-side in `/api/upload` route, return to client, client uploads directly. Keeps large video files off Workers' CPU limits.
9. **DO hibernation**: Use `state.acceptWebSocket()` to enable hibernation — Durable Object sleeps when all admins disconnect, costing nothing.
10. **Thai timezone**: `new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })` for display. Store raw UTC epoch in D1.
11. **Type limits**: Tournaments support per-type limits (`competitor_limit`, `attendee_limit`) in addition to overall `registration_limit`.
12. **Test mode**: When `test_mode = true`, registration window validation is bypassed — useful for testing without changing dates.
13. **Migration rule**: ALWAYS run `npx wrangler d1 execute tournament-db --local --file=drizzle/<filename>.sql` after modifying `.sql` files (documented in `CLAUDE.md`).
14. **UI components**: Uses daisyui with Tailwind CSS for styling. Design system follows `DESIGN.md` (Anthropic-inspired warm cream + coral aesthetic).
