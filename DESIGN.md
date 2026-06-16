# Tournament — Design System

Tailwind CSS v4 (`@tailwindcss/vite`). All tokens in `app/app.css` under `@theme {}`.  
Font: **Noto Sans Thai** (Google Fonts) — all text, Thai + Latin.

---

## Colors

All available as Tailwind utilities: `bg-primary`, `text-ink`, `border-hairline`, etc.

| Token | Value | Tailwind class |
|---|---|---|
| `--color-primary` | `#cc785c` | `bg-primary` / `text-primary` |
| `--color-primary-active` | `#a9583e` | `bg-primary-active` |
| `--color-primary-disabled` | `#e6dfd8` | `bg-primary-disabled` |
| `--color-canvas` | `#faf9f5` | `bg-canvas` |
| `--color-surface-soft` | `#f5f0e8` | `bg-surface-soft` |
| `--color-surface-card` | `#efe9de` | `bg-surface-card` |
| `--color-surface-dark` | `#181715` | `bg-surface-dark` |
| `--color-surface-dark-elevated` | `#252320` | `bg-surface-dark-elevated` |
| `--color-hairline` | `#e6dfd8` | `border-hairline` |
| `--color-hairline-soft` | `#ebe6df` | `border-hairline-soft` |
| `--color-ink` | `#141413` | `text-ink` |
| `--color-body` | `#3d3d3a` | `text-body` |
| `--color-muted` | `#6c6a64` | `text-muted` |
| `--color-muted-soft` | `#8e8b82` | `text-muted-soft` |
| `--color-success` | `#5db872` | `text-success` / `bg-success` |
| `--color-warning` | `#d4a017` | `text-warning` |
| `--color-error` | `#c64545` | `text-error` |

---

## Spacing

All available as Tailwind spacing utilities: `p-lg`, `gap-sm`, `mb-xl`, etc.

| Token | Value | Tailwind |
|---|---|---|
| `--spacing-xxs` | `4px` | `p-xxs` / `gap-xxs` |
| `--spacing-xs` | `8px` | `p-xs` / `gap-xs` |
| `--spacing-sm` | `12px` | `p-sm` / `gap-sm` |
| `--spacing-md` | `16px` | `p-md` / `gap-md` |
| `--spacing-lg` | `24px` | `p-lg` / `gap-lg` |
| `--spacing-xl` | `32px` | `p-xl` / `gap-xl` |
| `--spacing-xxl` | `48px` | `p-xxl` / `gap-xxl` |
| `--spacing-section` | `96px` | `py-section` |

---

## Border Radius

| Token | Value | Tailwind |
|---|---|---|
| `--radius-xs` | `4px` | `rounded-xs` |
| `--radius-sm` | `6px` | `rounded-sm` |
| `--radius-md` | `8px` | `rounded-md` |
| `--radius-lg` | `12px` | `rounded-lg` |
| `--radius-xl` | `16px` | `rounded-xl` |
| `--radius-pill` | `9999px` | `rounded-pill` |

---

## Typography

Font stack (both display and body): `"Noto Sans Thai", sans-serif`

### Headings (global CSS reset)

```
h1 → 64px / 600
h2 → 48px / 600
h3 → 36px / 600
h4 → 28px / 600
h5 → 22px / 600
h6 → 18px / 600
```

> Never use bare `h1`–`h6` tags for admin UI. Use `text-[20px] font-semibold` inline instead to control size precisely.

### Display classes

| Class | Size | Weight |
|---|---|---|
| `.display-xl` | 64px | 700 |
| `.display-lg` | 48px | 700 |
| `.display-md` | 36px | 600 |
| `.display-sm` | 28px | 600 |

### Tailwind font-size conventions used in this project

| Usage | Class |
|---|---|
| Page title (admin) | `text-[20px] font-semibold` |
| Section heading | `text-[18px] font-semibold` |
| Card title | `text-[16px] font-semibold` |
| Body | `text-sm` (14px) |
| Caption / label | `text-xs` (12px) |
| Table header | `text-sm font-medium text-muted` |

---

## Component Classes

Defined in `app/app.css` — use directly as Tailwind-style class names.

### Buttons

```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-sm btn-primary">Small</button>
<button class="btn btn-sm btn-circle btn-ghost"><Icon /></button>
```

- `btn-primary` → coral background, white text
- `btn-secondary` → canvas bg, hairline border
- `btn-ghost` → transparent, hover surface-soft
- `btn-sm` → reduced padding/height
- `btn-circle` → 1:1 circular

### Card

```html
<div class="card">...</div>           <!-- default: bg-surface-card, rounded-lg, p-lg -->
<div class="card p-0">...</div>       <!-- no padding (for cover-image cards) -->
<div class="card !p-0">...</div>      <!-- force no padding -->
```

> Card default padding is `var(--spacing-lg)` (24px).  
> Tournament cards with cover photos must use `p-0` or `!p-0`.

### Form inputs

```html
<input class="input w-full" />
<select class="select w-full" />
<textarea class="textarea w-full" />
<label class="label">Label text</label>
```

- All inputs: canvas bg, hairline border, `rounded-md`, height 40px
- Placeholder color: `--color-body` (same as normal text)
- Focus: primary (coral) ring

### Badge

```html
<span class="badge-pill">ผู้เข้าแข่งขัน</span>
```

- Background: `surface-card`, rounded-pill, 12px text

### Modal

```html
<dialog class="modal">
  <div class="modal-content max-w-[560px]">...</div>
</dialog>
```

---

## Layout Patterns

### Page container (admin)

```html
<div class="max-w-[1200px] mx-auto px-lg py-xl">
```

### Page container (narrow / form)

```html
<div class="max-w-[480px] mx-auto px-lg py-xl">
```

### Section heading row

```html
<div class="flex justify-between items-center mb-lg">
  <h2 class="text-[20px] font-semibold m-0">Title</h2>
  <button class="btn btn-primary">Action</button>
</div>
```

### Card grid (tournament list)

```html
<div class="grid gap-lg" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))">
  <div class="card p-0 flex flex-col overflow-hidden">
    <div class="w-full" style="aspect-ratio: 16/9">cover</div>
    <div class="p-lg">content</div>
  </div>
</div>
```

---

## Header

Shared `<Header />` component (public pages + `/admin`):

- `sticky top-0 z-50 bg-canvas border-b border-hairline`
- Height: `h-14` (56px)
- Max width: `max-w-[1200px] mx-auto px-lg`
- Logo: `T` mark (coral `bg-primary`, 7×7, `rounded-md`) + "Tournament" text
- Desktop nav: `hidden sm:flex` — visible ≥640px
- Hamburger: `sm:hidden` — visible <640px only

`<AdminNav />` (tournament admin pages):

- Same base style as `<Header />`
- Breadcrumb: T logo → `/` → tournament name
- Active nav link: `text-primary bg-[rgba(204,120,92,0.1)]`
- Inactive nav link: `text-muted hover:text-body hover:bg-surface-soft`
- Labels hidden on mobile (`hidden md:inline`), icons always visible

---

## Responsive Breakpoints (Tailwind defaults)

| Prefix | Min-width | Usage |
|---|---|---|
| `sm:` | 640px | Show/hide header nav vs hamburger |
| `md:` | 768px | Show AdminNav labels, show full text |
| `lg:` | 1024px | — |

> **Do not define `--breakpoint-*` in `@theme`** — causes conflicts with responsive utilities.  
> **Do not define `.hidden`, `.flex`, `.block` etc in custom CSS** — overrides Tailwind responsive variants like `sm:flex`.

---

## Dos & Don'ts

### Do
- Use `p-0` on `.card` when the card has a cover photo at top
- Use `text-[Npx] font-semibold` for UI headings, not bare `h2` (which is 48px by default)
- Use `text-muted` for secondary labels, icons, timestamps
- Use `var(--spacing-*)` in inline styles when Tailwind utility isn't available
- Use `backdrop-filter: blur(6px)` + `rgba` bg for overlay badges/chips over images
- Use `sm:hidden` / `hidden sm:flex` for hamburger/nav toggle

### Don't
- Don't add custom `.hidden { display: none }` to CSS — breaks `sm:flex`, `md:flex` variants
- Don't use bare `h1`–`h6` in admin UI pages (sizes are 36–64px, too large)
- Don't hardcode `px`, `py` on cards that need cover images — use `p-0` at card level, then `p-lg` on inner content div
- Don't define Tailwind spacing names (`sm`, `md`, `lg`) as breakpoint overrides in `@theme`
- Don't import Google Fonts other than `Noto Sans Thai` — the project uses a single font

---

## Migration Rule

When creating or editing `.sql` in `drizzle/`, always run local migrate immediately:

```bash
npx wrangler d1 execute tournament-db --local --file=drizzle/<filename>.sql
```
