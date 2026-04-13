# shadcn/ui Frontend Rewrite Design

## Goal

Rewrite the entire React frontend using shadcn/ui components. No backend changes. Focus on responsive design, polished UX, and a configurable theme system. Keep folder structure and code simple.

## Architecture

Vite + React 19 + TypeScript, unchanged. Add Tailwind CSS v4 (via `@tailwindcss/vite`) as the style engine — required by shadcn/ui. All shadcn components are copied into `src/components/ui/` (source-owned, not a runtime dependency). `api.ts` and `AuthContext.tsx` are untouched.

## Tech Stack

| Package | Purpose |
|---|---|
| `tailwindcss` + `@tailwindcss/vite` | Style engine (Tailwind v4) |
| `shadcn/ui` CLI | Scaffolds component source into `src/components/ui/` |
| `lucide-react` | Icon set (shadcn default) |
| `sonner` | Toast notifications |
| `class-variance-authority`, `clsx`, `tailwind-merge` | shadcn utilities (installed by CLI) |

## Theming

All colors are CSS custom properties in `index.css`. To change the theme, edit only the `:root` block — no component changes needed.

```css
:root {
  /* Layout */
  --background: #f8fafc;
  --foreground: #0f172a;

  /* Sidebar */
  --sidebar-bg: #0f172a;
  --sidebar-fg: #f8fafc;
  --sidebar-accent: #1e293b;
  --sidebar-accent-fg: #ffffff;
  --sidebar-muted: #64748b;

  /* Brand / primary action */
  --primary: #0ea5e9;
  --primary-foreground: #ffffff;

  /* Cards and surfaces */
  --card: #ffffff;
  --card-foreground: #0f172a;
  --border: #e2e8f0;

  /* States */
  --muted: #f1f5f9;
  --muted-foreground: #94a3b8;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
}
```

Tailwind's config maps these via `@theme` so components use semantic names (`bg-primary`, `text-muted-foreground`, `border-border`) not raw hex.

## Folder Structure

```
frontend/src/
├── components/
│   ├── ui/              ← shadcn-generated (Button, Card, Input, Select,
│   │                       Tabs, Badge, Skeleton, Alert, AlertDialog,
│   │                       Switch, Textarea, Separator, Tooltip)
│   ├── AppShell.tsx     ← sidebar (md+) + bottom tab bar (mobile)
│   └── PageHeader.tsx   ← back button + title + action buttons, used by all inner pages
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── VisitDetailPage.tsx
│   ├── VisitFormPage.tsx
│   └── SearchPage.tsx
├── api.ts               ← unchanged
├── AuthContext.tsx       ← unchanged
├── App.tsx              ← unchanged routing; wraps authenticated routes in AppShell
├── index.css            ← Tailwind directives + CSS variable theme
└── main.tsx             ← unchanged
```

## AppShell Component

Handles all responsive navigation. Authenticated pages render inside it; `LoginPage` does not.

**Desktop (`md` and above):**
- Fixed left sidebar: 64px (icon-only) at `md`, 200px (icon + label) at `lg+` — purely breakpoint-driven, no toggle
- Top section: app logo/name
- Nav items: Home (dashboard), Search — using lucide icons + labels
- Bottom section: user avatar + name, with a sign-out option via `Tooltip` or dropdown
- Content area fills remaining width with a top `PageHeader`

**Mobile (below `md`):**
- No sidebar — hidden
- Bottom tab bar fixed to bottom of screen: Home | Search icons with labels
- Top area shows just the page title (from `PageHeader`)

`AppShell` accepts `children` and renders the page content in a scrollable main area.

## PageHeader Component

```tsx
<PageHeader
  title="Visit Detail"
  backHref="/"
  actions={<><Button variant="outline">Edit</Button><Button variant="destructive">Delete</Button></>}
/>
```

Renders: back chevron button (left) + title (centre on mobile, left on desktop) + action buttons (right). Used on VisitDetail, VisitForm, Search.

## shadcn Components to Install

```
button card input select textarea tabs badge skeleton alert
alert-dialog switch separator tooltip
```

Plus `sonner` for toasts (installed separately, not via shadcn CLI).

## Page Designs

### LoginPage

- Full-height centered layout (no AppShell)
- `Card` with app name ("MedHistory"), subtitle ("Your personal medical record, organised.")
- `Button` with Google icon (lucide `Chrome` or inline SVG) — links to `/oauth2/authorization/google`
- No other content

### DashboardPage

- `PageHeader`: title "Your Visits", action `Button` "+ Add Visit" → `/visits/new`
- Loading state: 3 `Skeleton` placeholder cards
- Error state: `Alert` variant destructive with message
- Empty state: centered text + `Button` "Add your first visit"
- Visits grouped by year:
  - Year label: muted uppercase `<p>` (e.g. "2025")
  - Each visit: `Card` (clickable, cursor-pointer, hover shadow) with:
    - Top row: date in muted text + specialty `Badge` (variant outline)
    - Doctor name in semibold
    - Clinic in muted small text (with MapPin lucide icon)
    - Diagnosis snippet in muted text (truncated to 1 line)
    - Chevron icon aligned right

### VisitDetailPage

- `PageHeader`: back to `/`, title "Visit Detail", actions: Edit `Button` (outline) + Delete `Button` (destructive)
- Delete triggers `AlertDialog`: "Delete this visit? This cannot be undone." — Cancel / Delete buttons
- Error state: `Alert` destructive
- Loading state: `Skeleton` blocks matching the card layout

**Visit summary card** (`Card`):
- Date + specialty `Badge` in top row
- Doctor name as heading
- Clinic with MapPin icon
- Chief complaint, diagnosis, notes — each on its own line with label

**`Tabs`** below summary — four tabs:

**Medications tab:**
- "+ Add" `Button` (outline, small) in tab header area
- Add form: inline collapsible — Name (`Input` required), Dosage, Frequency (`Input`s), Save `Button`
- Each medication item: name (semibold) + dosage + frequency `Badge`s + delete `Button` (ghost, destructive, X icon)
- Reminder sub-row per medication: time picker (`Input type="time"`) + "+ Reminder" `Button` + list of existing reminders with time, `Switch` (enabled/disabled), delete `Button`
- Success feedback via `sonner` toast on add/delete

**Recommendations tab:**
- "+ Add" `Button` in tab header
- Add form: Title (`Input` required), Description (`Textarea`), Follow-up date (`Input type="date"`), Save
- Each rec: title (semibold) + follow-up date `Badge` + delete `Button`
- Description shown below in muted text if present
- `sonner` toast on add/delete

**Attachments tab:**
- "Upload" `Button` (outline) — triggers hidden `<input type="file">`
- Upload shows loading spinner on `Button` while in progress
- Each attachment: file icon (lucide `FileText`) + filename as clickable link (opens presigned URL) + size in muted text + delete `Button`
- `sonner` toast on upload/delete

**Reminders tab:**
- Lists all reminders for this visit across all medications
- Each row: medication name + time + `Switch` toggle + delete `Button`
- No add form here (add reminders from Medications tab)
- Empty state: "Add reminders from the Medications tab"

### VisitFormPage

- `PageHeader`: back, title "New Visit" or "Edit Visit"
- `Card` wrapping the form
- Two-column row on desktop (`grid grid-cols-2 gap-4`), single column on mobile:
  - Date (`Input type="date"` required) + Doctor (`Input` required)
  - Specialty (`Select` with seeded options + "Other…" → reveal second `Input`) + Clinic (`Input`)
- Full-width fields below:
  - Chief Complaint (`Input`)
  - Diagnosis (`Input`)
  - Notes (`Textarea`, resizable)
- Footer: Cancel `Button` (ghost) + Save Visit `Button` (primary), right-aligned
- Error: `Alert` destructive above form
- `sonner` toast "Visit saved" on success

### SearchPage

- `PageHeader`: back, title "Search"
- Full-width search row: `Input` with Search lucide icon (left inset) + `Button` "Search"
- Loading: `Skeleton` cards
- Empty result: `Alert` or muted text "No results for 'query'"
- Results: same `Card` style as Dashboard cards, clickable

## Responsive Breakpoints

| Breakpoint | Sidebar | Visit Detail form layout | Visit form grid |
|---|---|---|---|
| `< md` (< 768px) | Hidden; bottom tab bar shown | Tabs scroll horizontally | Single column |
| `md+` (≥ 768px) | 64px icon sidebar | Tabs full width | Two columns |
| `lg+` (≥ 1024px) | 200px icon+label sidebar | Tabs full width | Two columns |

## UX Improvements Over Current Frontend

| Current | New |
|---|---|
| `window.confirm()` for deletes | `AlertDialog` with styled confirm |
| No success feedback | `sonner` toast on every mutation |
| "Loading…" text | `Skeleton` placeholder cards |
| Red `<p>` for errors | `Alert` destructive component |
| Reminders cramped inside medication rows | Dedicated Reminders tab |
| All inline styles (no design system) | shadcn/ui + Tailwind + CSS variable theme |
| Not responsive | Sidebar ↔ bottom tab bar; responsive form grids |

## What Does Not Change

- `api.ts` — all API calls, types, and interfaces unchanged
- `AuthContext.tsx` — unchanged
- `App.tsx` routing logic — unchanged, just wraps authenticated routes in `AppShell`
- Backend — zero changes
