# Ant Design Migration Design

**Date:** 2026-04-13
**Status:** Approved

## Goal

Replace the shadcn/ui + Tailwind CSS stack with Ant Design (antd v5) across all frontend pages. Keep the same visual structure: collapsible sidebar navigation (desktop), bottom tab bar (mobile), tabs in the visit detail page. Drop sonner and lucide-react in favour of AntD's `message` API and `@ant-design/icons`.

## Approach

Page-by-page migration (Option B): deps swap first, then AppShell, then pages from simplest to most complex. App remains runnable after each step.

---

## Dependency Changes

### Remove

| Package | Reason |
|---|---|
| `radix-ui` | shadcn primitive layer |
| `shadcn` | component CLI/runtime |
| `class-variance-authority` | shadcn variant util |
| `tailwind-merge` | Tailwind class merge util |
| `clsx` | class concatenation util |
| `tailwindcss` | CSS framework |
| `@tailwindcss/vite` | Vite plugin for Tailwind |
| `lucide-react` | icon library |
| `sonner` | toast library |

### Add

| Package | Reason |
|---|---|
| `antd` | component library + design system |
| `@ant-design/icons` | icon library |

### Files deleted

- `frontend/src/components/ui/` — all shadcn-generated components
- `frontend/src/lib/utils.ts` — only contains `cn` Tailwind helper
- `frontend/components.json` — shadcn CLI config
- `frontend/src/index.css` — replace Tailwind directives with bare AntD reset import

### Files updated

- `frontend/vite.config.ts` — remove `tailwindcss()` plugin
- `frontend/package.json` — dependency changes above

---

## Theme

AntD `ConfigProvider` at the root (`App.tsx`) with these token overrides:

```ts
theme={{
  token: {
    colorPrimary: '#4f46e5',   // indigo, matches current primary
    borderRadius: 8,
  },
}}
```

Everything else uses AntD's default light theme.

---

## AppShell

Built with AntD `Layout` + `Sider` + `Menu` + `Avatar`.

**Desktop:**
- `Sider` — `collapsedWidth=64`, `width=200`, collapsed state driven by a `useBreakpoint` hook (collapses below `lg`)
- `Menu` — `mode="inline"`, `selectedKeys` derived from `useLocation()`, items: Home (`HomeOutlined`) and Search (`SearchOutlined`)
- Sider footer — AntD `Avatar` with user picture or initials, user name shown when expanded

**Mobile (below `md`):**
- Fixed bottom `<nav>` (plain HTML, inline styles — no Tailwind, no AntD Layout component)
- Two `Button` (type="text") items with `@ant-design/icons` icons + label
- Active item uses `colorPrimary` token colour; inactive uses AntD's `colorTextSecondary` token

**Root layout:**
```
<ConfigProvider theme={...}>
  <App>                          ← gives message/modal/notification context
    <Layout>
      <Sider>...</Sider>
      <Layout>
        <Content>{children}</Content>
      </Layout>
    </Layout>
    <MobileNav />
  </App>
</ConfigProvider>
```

---

## Component Mapping

| shadcn component | AntD equivalent |
|---|---|
| `Button` | `Button` |
| `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription` | `Card` (with `title` prop) |
| `Badge` | `Tag` |
| `Input` | `Input` |
| `Textarea` | `Input.TextArea` |
| `Select`, `SelectItem`, `SelectTrigger`, `SelectContent`, `SelectValue` | `Select` with `options` prop |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `Tabs` with `items` prop |
| `Switch` | `Switch` |
| `Skeleton` | `Skeleton` |
| `Alert`, `AlertDescription` | `Alert` |
| `AlertDialog` (delete confirmation) | `Modal.confirm` (imperative API) |
| `Separator` | `Divider` |
| `toast.success()` / `toast.error()` from sonner | `message.success()` / `message.error()` from AntD (via `App.useApp()`) |

**Icons mapping:**

| lucide-react | @ant-design/icons |
|---|---|
| `Home` | `HomeOutlined` |
| `Search` | `SearchOutlined` |
| `Plus` | `PlusOutlined` |
| `X` | `CloseOutlined` |
| `Trash2` | `DeleteOutlined` |
| `MapPin` | `EnvironmentOutlined` |
| `Pill` | `MedicineBoxOutlined` |
| `ClipboardList` | `FileTextOutlined` |
| `Paperclip` | `PaperClipOutlined` |
| `Bell` | `BellOutlined` |
| `FileText` | `FileOutlined` |
| `ChevronRight` | `RightOutlined` |

---

## Page Migration Order

1. **LoginPage** — no shadcn components, remove Tailwind classes only
2. **DashboardPage** — Button, Card, Tag, Skeleton, Alert
3. **SearchPage** — Input, Card, Tag, Skeleton
4. **VisitFormPage** — Input, Input.TextArea, Select, Button, Card
5. **VisitDetailPage** — Tabs, Switch, Modal.confirm, Card, Input, Tag, Skeleton, Alert, message API

**PageHeader component** rewritten with AntD `Flex` + `Typography.Title` + `Button` (back arrow via `ArrowLeftOutlined`).

---

## Error Handling / Toasts

All `toast.success()` and `toast.error()` calls replaced with `message.success()` / `message.error()` from the AntD `App` context accessed via `App.useApp()` hook in each component.

The `App` wrapper in `App.tsx` provides the context; components call `const { message } = App.useApp()` at the top of each page component.

---

## Non-Goals

- No changes to backend, API layer, or routing
- No new pages or features
- No dark mode toggle (AntD supports it but not in scope)
- No migration of the service worker or push logic
