# Medical History Manager — Plan 3: Frontend + Build + Docs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Plan 2 (Backend Features) must be complete and the backend must be running locally.

**Goal:** Build the full React frontend (auth, timeline, visit management, medications, recommendations, attachments, search, push reminders), wire the Maven build so a single `mvn package` produces the complete fat JAR, and write comprehensive README.md and SETUP.md documentation.

**Architecture:** React 18 + Vite + TypeScript SPA. shadcn/ui components with Tailwind CSS. TanStack Query manages all server state. React Router v6 for client-side routing. A Service Worker (`/sw.js`) handles incoming push events and shows OS notifications. The Vite build is invoked by `frontend-maven-plugin` during `mvn package`; the output is copied into `src/main/resources/static/` and embedded in the Spring Boot JAR.

**Tech Stack:** React 18 · Vite · TypeScript · shadcn/ui · Tailwind CSS · TanStack Query · React Router v6 · React Hook Form · Zod · Service Worker (Web Push API) · Maven `frontend-maven-plugin`

---

## File Map

### Frontend (`frontend/`)

| Path | Purpose |
|------|---------|
| `package.json` | Dependencies + scripts |
| `tsconfig.json` | TypeScript config |
| `vite.config.ts` | Vite config (proxy to backend in dev) |
| `tailwind.config.ts` | Tailwind theme |
| `components.json` | shadcn/ui config |
| `index.html` | HTML shell |
| `public/sw.js` | Service Worker — handles push events |
| `src/main.tsx` | React + QueryClient + Router bootstrap |
| `src/App.tsx` | Route definitions + auth guard |
| `src/lib/api.ts` | Fetch wrapper (base URL, error handling, cookie auth) |
| `src/hooks/useAuth.ts` | Current user query + logout mutation |
| `src/hooks/useVisits.ts` | Visit list, get, create, update, delete, search |
| `src/hooks/useMedications.ts` | Medication CRUD mutations |
| `src/hooks/useRecommendations.ts` | Recommendation CRUD mutations |
| `src/hooks/useAttachments.ts` | Attachment upload, list, presigned URL, delete |
| `src/hooks/useReminders.ts` | Reminder create, toggle, delete |
| `src/hooks/usePush.ts` | Push subscription registration |
| `src/pages/LoginPage.tsx` | Google sign-in button |
| `src/pages/TimelinePage.tsx` | Visit list grouped by year |
| `src/pages/VisitFormPage.tsx` | New + edit visit form |
| `src/pages/VisitDetailPage.tsx` | Full visit with meds, recs, attachments |
| `src/pages/SearchPage.tsx` | Search input + results |
| `src/components/NavBar.tsx` | Top navigation with user avatar |
| `src/components/VisitCard.tsx` | Single timeline card |
| `src/components/MedicationSection.tsx` | Medication list + add/edit form |
| `src/components/RecommendationSection.tsx` | Recommendation list + add form |
| `src/components/AttachmentSection.tsx` | File upload + attachment list |
| `src/components/ReminderForm.tsx` | Set reminder time for a medication |
| `src/components/ErrorBoundary.tsx` | React error boundary |

### Root additions

| Path | Purpose |
|------|---------|
| `pom.xml` (modified) | Add `frontend-maven-plugin` + resource copy |
| `Dockerfile` | Build JAR + run in JRE container |
| `fly.toml` | Fly.io deployment config |
| `README.md` | Project overview, features, architecture |
| `SETUP.md` | Local dev + production deployment guide |

---

## Task 1: Frontend Project Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/components.json`

- [ ] **Step 1: Scaffold the frontend directory**

```bash
mkdir -p frontend/src/lib frontend/src/hooks frontend/src/pages frontend/src/components/ui frontend/public
```

- [ ] **Step 2: Create `frontend/package.json`**

```json
{
  "name": "medhistory-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.24.0",
    "@tanstack/react-query": "^5.50.0",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-switch": "^1.1.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "typescript": "^5.5.3",
    "vite": "^5.3.4"
  }
}
```

- [ ] **Step 3: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../src/main/resources/static',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 5: Create `frontend/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 6: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MedHistory</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `frontend/components.json`** (shadcn/ui config)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 8: Install dependencies**

```bash
cd frontend && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 9: Initialize shadcn/ui base styles and utility**

Create `frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

Create `frontend/src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 10: Add a few core shadcn/ui components manually**

Create `frontend/src/components/ui/button.tsx`:

```typescript
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

Create `frontend/src/components/ui/card.tsx`:

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
```

Create `frontend/src/components/ui/input.tsx`:

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
```

Create `frontend/src/components/ui/label.tsx`:

```typescript
import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

Create `frontend/src/components/ui/textarea.tsx`:

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
```

Create `frontend/src/components/ui/badge.tsx`:

```typescript
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

- [ ] **Step 11: Verify the frontend builds**

```bash
cd frontend && npm run build
```

Expected: TypeScript compiles, Vite outputs files to `../src/main/resources/static/`. No errors.

- [ ] **Step 12: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: scaffold React frontend with Vite, Tailwind, and shadcn/ui base components"
```

---

## Task 2: API Client + Auth Hook

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useAuth.ts`

- [ ] **Step 1: Create `frontend/src/lib/api.ts`**

```typescript
const BASE_URL = '/api'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public correlationId?: string
  ) {
    super(message)
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',   // send httpOnly cookie automatically
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const correlationId = response.headers.get('X-Correlation-Id') ?? undefined

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }))
    throw new ApiError(response.status, body.message ?? 'Request failed', correlationId)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, {
      method: 'POST',
      body: formData,
      headers: {},   // let browser set Content-Type with boundary
    }),
}

export { ApiError }
```

- [ ] **Step 2: Create `frontend/src/hooks/useAuth.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface UserProfile {
  id: string
  email: string
  name: string
  profilePicture: string | null
}

export function useCurrentUser() {
  return useQuery<UserProfile>({
    queryKey: ['user', 'me'],
    queryFn: () => api.get<UserProfile>('/users/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout', {}),
    onSuccess: () => {
      queryClient.clear()
      window.location.href = '/'
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/ frontend/src/hooks/useAuth.ts
git commit -m "feat: add API client and auth hook"
```

---

## Task 3: App Router + Login Page

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/components/ErrorBoundary.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Create `frontend/src/components/ErrorBoundary.tsx`**

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">{this.state.error?.message}</p>
          <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}>
            Go home
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 2: Create `frontend/src/pages/LoginPage.tsx`**

```typescript
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl">MedHistory</CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            Your personal medical records, organized.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            className="w-full"
            onClick={() => { window.location.href = '/oauth2/authorization/google' }}
          >
            Sign in with Google
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Your data is private and belongs to you.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create `frontend/src/App.tsx`**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/LoginPage'
import { TimelinePage } from '@/pages/TimelinePage'
import { VisitFormPage } from '@/pages/VisitFormPage'
import { VisitDetailPage } from '@/pages/VisitDetailPage'
import { SearchPage } from '@/pages/SearchPage'
import { NavBar } from '@/components/NavBar'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (isError || !user) {
    return <LoginPage />
  }

  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={
        <AuthGuard>
          <NavBar />
          <main className="container mx-auto px-4 py-6 max-w-3xl">
            <TimelinePage />
          </main>
        </AuthGuard>
      } />
      <Route path="/visits/new" element={
        <AuthGuard>
          <NavBar />
          <main className="container mx-auto px-4 py-6 max-w-3xl">
            <VisitFormPage />
          </main>
        </AuthGuard>
      } />
      <Route path="/visits/:id/edit" element={
        <AuthGuard>
          <NavBar />
          <main className="container mx-auto px-4 py-6 max-w-3xl">
            <VisitFormPage />
          </main>
        </AuthGuard>
      } />
      <Route path="/visits/:id" element={
        <AuthGuard>
          <NavBar />
          <main className="container mx-auto px-4 py-6 max-w-3xl">
            <VisitDetailPage />
          </main>
        </AuthGuard>
      } />
      <Route path="/search" element={
        <AuthGuard>
          <NavBar />
          <main className="container mx-auto px-4 py-6 max-w-3xl">
            <SearchPage />
          </main>
        </AuthGuard>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 4: Create `frontend/src/main.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false
        return failureCount < 2
      },
    },
  },
})

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
```

- [ ] **Step 5: Create stub pages so App.tsx compiles**

Create `frontend/src/pages/TimelinePage.tsx` (stub, replaced in Task 4):

```typescript
export function TimelinePage() {
  return <div>Timeline — coming soon</div>
}
```

Create `frontend/src/pages/VisitFormPage.tsx` (stub, replaced in Task 5):

```typescript
export function VisitFormPage() {
  return <div>Visit Form — coming soon</div>
}
```

Create `frontend/src/pages/VisitDetailPage.tsx` (stub, replaced in Task 6):

```typescript
export function VisitDetailPage() {
  return <div>Visit Detail — coming soon</div>
}
```

Create `frontend/src/pages/SearchPage.tsx` (stub, replaced in Task 8):

```typescript
export function SearchPage() {
  return <div>Search — coming soon</div>
}
```

Create `frontend/src/components/NavBar.tsx` (stub, replaced in Task 9):

```typescript
export function NavBar() {
  return <nav className="border-b px-4 py-3 flex items-center justify-between">
    <span className="font-semibold">MedHistory</span>
  </nav>
}
```

- [ ] **Step 6: Verify the frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: `built in X.XXs` — no TypeScript or Vite errors.

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend/src/
git commit -m "feat: add App router, auth guard, login page, and error boundary"
```

---

## Task 4: Visit Hooks + Timeline Page

**Files:**
- Create: `frontend/src/hooks/useVisits.ts`
- Modify: `frontend/src/pages/TimelinePage.tsx`
- Create: `frontend/src/components/VisitCard.tsx`

- [ ] **Step 1: Create `frontend/src/hooks/useVisits.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface VisitSummary {
  id: string
  visitDate: string
  doctorName: string | null
  specialty: string | null
  diagnosis: string | null
  medicationCount: number
  attachmentCount: number
}

export interface VisitDetail {
  id: string
  visitDate: string
  doctorName: string | null
  specialty: string | null
  clinic: string | null
  chiefComplaint: string | null
  diagnosis: string | null
  notes: string | null
}

export interface VisitRequest {
  visitDate: string
  doctorName?: string
  specialty?: string
  clinic?: string
  chiefComplaint?: string
  diagnosis?: string
  notes?: string
}

interface Page<T> {
  content: T[]
  totalPages: number
  totalElements: number
  number: number
}

export function useVisits(page = 0) {
  return useQuery<Page<VisitSummary>>({
    queryKey: ['visits', page],
    queryFn: () => api.get<Page<VisitSummary>>(`/visits?page=${page}&size=20`),
  })
}

export function useVisit(id: string) {
  return useQuery<VisitDetail>({
    queryKey: ['visits', id],
    queryFn: () => api.get<VisitDetail>(`/visits/${id}`),
  })
}

export function useSearchVisits(q: string) {
  return useQuery<VisitSummary[]>({
    queryKey: ['visits', 'search', q],
    queryFn: () => api.get<VisitSummary[]>(`/visits/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 1,
  })
}

export function useCreateVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: VisitRequest) => api.post<VisitDetail>('/visits', req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits'] }),
  })
}

export function useUpdateVisit(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: VisitRequest) => api.put<VisitDetail>(`/visits/${id}`, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits'] }),
  })
}

export function useDeleteVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/visits/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits'] }),
  })
}
```

- [ ] **Step 2: Create `frontend/src/components/VisitCard.tsx`**

```typescript
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Paperclip, Pill, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import type { VisitSummary } from '@/hooks/useVisits'

interface Props { visit: VisitSummary }

export function VisitCard({ visit }: Props) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/visits/${visit.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(visit.visitDate), 'dd MMM yyyy')}
            </p>
            <CardTitle className="text-lg">
              {visit.doctorName ?? 'Unknown Doctor'}
              {visit.specialty && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  · {visit.specialty}
                </span>
              )}
            </CardTitle>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {visit.diagnosis && (
          <p className="text-sm text-foreground mb-3">{visit.diagnosis}</p>
        )}
        <div className="flex gap-3">
          {visit.medicationCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Pill className="h-3 w-3" />
              {visit.medicationCount} medication{visit.medicationCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {visit.attachmentCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {visit.attachmentCount} file{visit.attachmentCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Replace stub `frontend/src/pages/TimelinePage.tsx`**

```typescript
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { VisitCard } from '@/components/VisitCard'
import { useVisits } from '@/hooks/useVisits'
import { Plus } from 'lucide-react'
import { getYear } from 'date-fns'

export function TimelinePage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useVisits()

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading visits...</div>
  if (isError) return <div className="text-center py-12 text-destructive">Failed to load visits.</div>

  const visits = data?.content ?? []

  // Group by year
  const grouped: Record<number, typeof visits> = {}
  for (const visit of visits) {
    const year = getYear(new Date(visit.visitDate))
    if (!grouped[year]) grouped[year] = []
    grouped[year].push(visit)
  }
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Medical Timeline</h1>
        <Button onClick={() => navigate('/visits/new')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Visit
        </Button>
      </div>

      {visits.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No visits yet.</p>
          <p className="text-sm mt-1">Add your first doctor visit to get started.</p>
        </div>
      )}

      {years.map(year => (
        <section key={year}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            {year}
          </h2>
          <div className="space-y-3">
            {grouped[year].map(visit => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Build to verify**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/hooks/useVisits.ts frontend/src/components/VisitCard.tsx frontend/src/pages/TimelinePage.tsx
git commit -m "feat: add timeline page with year-grouped visit cards"
```

---

## Task 5: Visit Form Page (New + Edit)

**Files:**
- Modify: `frontend/src/pages/VisitFormPage.tsx`

- [ ] **Step 1: Replace stub `frontend/src/pages/VisitFormPage.tsx`**

```typescript
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVisit, useCreateVisit, useUpdateVisit } from '@/hooks/useVisits'
import { useEffect } from 'react'
import { format } from 'date-fns'

const schema = z.object({
  visitDate: z.string().min(1, 'Date is required'),
  doctorName: z.string().optional(),
  specialty: z.string().optional(),
  clinic: z.string().optional(),
  chiefComplaint: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function VisitFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const { data: existing } = useVisit(id ?? '')
  const createVisit = useCreateVisit()
  const updateVisit = useUpdateVisit(id ?? '')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { visitDate: format(new Date(), 'yyyy-MM-dd') },
  })

  useEffect(() => {
    if (existing) {
      reset({
        visitDate: existing.visitDate,
        doctorName: existing.doctorName ?? '',
        specialty: existing.specialty ?? '',
        clinic: existing.clinic ?? '',
        chiefComplaint: existing.chiefComplaint ?? '',
        diagnosis: existing.diagnosis ?? '',
        notes: existing.notes ?? '',
      })
    }
  }, [existing, reset])

  const onSubmit = async (values: FormValues) => {
    if (isEdit) {
      await updateVisit.mutateAsync(values)
      navigate(`/visits/${id}`)
    } else {
      const visit = await createVisit.mutateAsync(values)
      navigate(`/visits/${visit.id}`)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isEdit ? 'Edit Visit' : 'New Visit'}</h1>

      <Card>
        <CardHeader><CardTitle>Visit Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="visitDate">Date *</Label>
              <Input id="visitDate" type="date" {...register('visitDate')} />
              {errors.visitDate && <p className="text-sm text-destructive mt-1">{errors.visitDate.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doctorName">Doctor Name</Label>
                <Input id="doctorName" placeholder="Dr. Smith" {...register('doctorName')} />
              </div>
              <div>
                <Label htmlFor="specialty">Specialty</Label>
                <Input id="specialty" placeholder="GP, Cardiologist…" {...register('specialty')} />
              </div>
            </div>

            <div>
              <Label htmlFor="clinic">Clinic / Hospital</Label>
              <Input id="clinic" placeholder="Apollo, Fortis…" {...register('clinic')} />
            </div>

            <div>
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <Input id="chiefComplaint" placeholder="Why did you visit?" {...register('chiefComplaint')} />
            </div>

            <div>
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea id="diagnosis" placeholder="What was the diagnosis?" {...register('diagnosis')} />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Any additional notes…" rows={4} {...register('notes')} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? 'Save Changes' : 'Create Visit'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/pages/VisitFormPage.tsx
git commit -m "feat: add visit create/edit form page"
```

---

## Task 6: Medication, Recommendation, Attachment Hooks

**Files:**
- Create: `frontend/src/hooks/useMedications.ts`
- Create: `frontend/src/hooks/useRecommendations.ts`
- Create: `frontend/src/hooks/useAttachments.ts`
- Create: `frontend/src/hooks/useReminders.ts`

- [ ] **Step 1: Create `frontend/src/hooks/useMedications.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Medication {
  id: string
  visitId: string
  name: string
  dosage: string | null
  frequency: string | null
  durationDays: number | null
  worked: 'yes' | 'no' | 'partial' | null
  sideEffects: string | null
  wouldUseAgain: boolean | null
}

export interface MedicationRequest {
  name: string
  dosage?: string
  frequency?: string
  durationDays?: number
  worked?: string
  sideEffects?: string
  wouldUseAgain?: boolean
}

export function useMedications(visitId: string) {
  return useQuery<Medication[]>({
    queryKey: ['visits', visitId, 'medications'],
    queryFn: () => api.get<Medication[]>(`/visits/${visitId}/medications`),
  })
}

export function useCreateMedication(visitId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: MedicationRequest) => api.post<Medication>(`/visits/${visitId}/medications`, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits', visitId, 'medications'] }),
  })
}

export function useUpdateMedication(visitId: string, medicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: MedicationRequest) =>
      api.put<Medication>(`/visits/${visitId}/medications/${medicationId}`, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits', visitId, 'medications'] }),
  })
}

export function useDeleteMedication(visitId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (medicationId: string) => api.delete(`/visits/${visitId}/medications/${medicationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits', visitId, 'medications'] }),
  })
}
```

- [ ] **Step 2: Create `frontend/src/hooks/useRecommendations.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Recommendation {
  id: string
  visitId: string
  type: 'physical' | 'diet' | 'other'
  description: string
}

export interface RecommendationRequest {
  type: string
  description: string
}

export function useRecommendations(visitId: string) {
  return useQuery<Recommendation[]>({
    queryKey: ['visits', visitId, 'recommendations'],
    queryFn: () => api.get<Recommendation[]>(`/visits/${visitId}/recommendations`),
  })
}

export function useCreateRecommendation(visitId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: RecommendationRequest) =>
      api.post<Recommendation>(`/visits/${visitId}/recommendations`, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits', visitId, 'recommendations'] }),
  })
}

export function useDeleteRecommendation(visitId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recId: string) => api.delete(`/visits/${visitId}/recommendations/${recId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits', visitId, 'recommendations'] }),
  })
}
```

- [ ] **Step 3: Create `frontend/src/hooks/useAttachments.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Attachment {
  id: string
  visitId: string
  displayName: string
  fileType: string | null
  contentType: string | null
  sizeBytes: number | null
}

export function useAttachments(visitId: string) {
  return useQuery<Attachment[]>({
    queryKey: ['visits', visitId, 'attachments'],
    queryFn: () => api.get<Attachment[]>(`/visits/${visitId}/attachments`),
  })
}

export function useUploadAttachment(visitId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, fileType }: { file: File; fileType: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', fileType)
      return api.upload<Attachment>(`/visits/${visitId}/attachments`, formData)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits', visitId, 'attachments'] }),
  })
}

export function usePresignedUrl() {
  return useMutation({
    mutationFn: ({ visitId, attachmentId }: { visitId: string; attachmentId: string }) =>
      api.get<{ url: string }>(`/visits/${visitId}/attachments/${attachmentId}/url`),
  })
}

export function useDeleteAttachment(visitId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) =>
      api.delete(`/visits/${visitId}/attachments/${attachmentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits', visitId, 'attachments'] }),
  })
}
```

- [ ] **Step 4: Create `frontend/src/hooks/useReminders.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Reminder {
  id: string
  medicationId: string
  reminderTime: string   // HH:mm
  active: boolean
}

export function useReminders(medicationId: string) {
  return useQuery<Reminder[]>({
    queryKey: ['medications', medicationId, 'reminders'],
    queryFn: () => api.get<Reminder[]>(`/medications/${medicationId}/reminders`),
  })
}

export function useCreateReminder(medicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reminderTime: string) =>
      api.post<Reminder>(`/medications/${medicationId}/reminders`, { reminderTime }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications', medicationId, 'reminders'] }),
  })
}

export function useToggleReminder(medicationId: string, reminderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.put<Reminder>(`/medications/${medicationId}/reminders/${reminderId}/toggle`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications', medicationId, 'reminders'] }),
  })
}

export function useDeleteReminder(medicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reminderId: string) =>
      api.delete(`/medications/${medicationId}/reminders/${reminderId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications', medicationId, 'reminders'] }),
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add React Query hooks for medications, recommendations, attachments, reminders"
```

---

## Task 7: Visit Detail Page + Section Components

**Files:**
- Modify: `frontend/src/pages/VisitDetailPage.tsx`
- Create: `frontend/src/components/MedicationSection.tsx`
- Create: `frontend/src/components/RecommendationSection.tsx`
- Create: `frontend/src/components/AttachmentSection.tsx`
- Create: `frontend/src/components/ReminderForm.tsx`

- [ ] **Step 1: Create `frontend/src/components/ReminderForm.tsx`**

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateReminder, useToggleReminder, useDeleteReminder, useReminders } from '@/hooks/useReminders'
import { usePush } from '@/hooks/usePush'
import { Bell, BellOff, Trash2 } from 'lucide-react'

interface Props { medicationId: string; medicationName: string }

export function ReminderForm({ medicationId, medicationName }: Props) {
  const [time, setTime] = useState('08:00')
  const { data: reminders } = useReminders(medicationId)
  const createReminder = useCreateReminder(medicationId)
  const { requestPermissionAndSubscribe } = usePush()

  const handleAdd = async () => {
    await requestPermissionAndSubscribe()
    await createReminder.mutateAsync(time)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end">
        <div>
          <Label htmlFor={`reminder-${medicationId}`}>Add Reminder</Label>
          <Input
            id={`reminder-${medicationId}`}
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-32"
          />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={createReminder.isPending}>
          <Bell className="h-4 w-4 mr-1" /> Set
        </Button>
      </div>

      {reminders && reminders.length > 0 && (
        <ul className="space-y-1">
          {reminders.map(r => (
            <ReminderRow key={r.id} reminder={r} medicationId={medicationId} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ReminderRow({ reminder, medicationId }: {
  reminder: { id: string; reminderTime: string; active: boolean }
  medicationId: string
}) {
  const toggle = useToggleReminder(medicationId, reminder.id)
  const del = useDeleteReminder(medicationId)

  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="font-mono">{reminder.reminderTime}</span>
      <span className={reminder.active ? 'text-green-600' : 'text-muted-foreground'}>
        {reminder.active ? 'Active' : 'Paused'}
      </span>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggle.mutate()}>
        {reminder.active ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(reminder.id)}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </li>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/MedicationSection.tsx`**

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMedications, useCreateMedication, useDeleteMedication, type MedicationRequest } from '@/hooks/useMedications'
import { ReminderForm } from './ReminderForm'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Props { visitId: string }

export function MedicationSection({ visitId }: Props) {
  const { data: medications } = useMedications(visitId)
  const createMedication = useCreateMedication(visitId)
  const deleteMedication = useDeleteMedication(visitId)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { register, handleSubmit, reset } = useForm<MedicationRequest>()

  const onSubmit = async (values: MedicationRequest) => {
    await createMedication.mutateAsync(values)
    reset()
    setShowForm(false)
  }

  const workedLabel = (w: string | null) => {
    if (w === 'yes') return <Badge variant="default">Worked</Badge>
    if (w === 'no') return <Badge variant="destructive">Didn't work</Badge>
    if (w === 'partial') return <Badge variant="secondary">Partial</Badge>
    return null
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">Medications</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">New Medication</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name *</Label>
                  <Input {...register('name', { required: true })} placeholder="Amoxicillin" />
                </div>
                <div>
                  <Label>Dosage</Label>
                  <Input {...register('dosage')} placeholder="500mg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Frequency</Label>
                  <Input {...register('frequency')} placeholder="TDS, Once daily…" />
                </div>
                <div>
                  <Label>Duration (days)</Label>
                  <Input type="number" {...register('durationDays', { valueAsNumber: true })} />
                </div>
              </div>
              <div>
                <Label>Did it work?</Label>
                <select {...register('worked')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">— not yet —</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div>
                <Label>Side effects</Label>
                <Textarea {...register('sideEffects')} placeholder="Any side effects?" rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="wouldUseAgain" {...register('wouldUseAgain')} />
                <Label htmlFor="wouldUseAgain">Would use again</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createMedication.isPending}>Save</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { reset(); setShowForm(false) }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {medications?.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No medications recorded.</p>
      )}

      <div className="space-y-2">
        {medications?.map(med => (
          <Card key={med.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{med.name}</span>
                    {med.dosage && <span className="text-sm text-muted-foreground">{med.dosage}</span>}
                    {med.frequency && <span className="text-sm text-muted-foreground">· {med.frequency}</span>}
                    {med.durationDays && <span className="text-sm text-muted-foreground">· {med.durationDays}d</span>}
                    {workedLabel(med.worked)}
                    {med.wouldUseAgain && <Badge variant="outline">Would use again</Badge>}
                  </div>
                  {med.sideEffects && (
                    <p className="text-sm text-muted-foreground mt-1">Side effects: {med.sideEffects}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => setExpandedId(expandedId === med.id ? null : med.id)}>
                    {expandedId === med.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                    onClick={() => deleteMedication.mutate(med.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {expandedId === med.id && (
                <div className="mt-3 pt-3 border-t">
                  <ReminderForm medicationId={med.id} medicationName={med.name} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/RecommendationSection.tsx`**

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useRecommendations, useCreateRecommendation, useDeleteRecommendation, type RecommendationRequest } from '@/hooks/useRecommendations'
import { Plus, Trash2 } from 'lucide-react'

interface Props { visitId: string }

const typeColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  physical: 'default',
  diet: 'secondary',
  other: 'outline',
}

export function RecommendationSection({ visitId }: Props) {
  const { data: recommendations } = useRecommendations(visitId)
  const createRec = useCreateRecommendation(visitId)
  const deleteRec = useDeleteRecommendation(visitId)
  const [showForm, setShowForm] = useState(false)
  const { register, handleSubmit, reset } = useForm<RecommendationRequest>()

  const onSubmit = async (values: RecommendationRequest) => {
    await createRec.mutateAsync(values)
    reset()
    setShowForm(false)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">Recommendations</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mb-4 p-4 border rounded-lg">
          <div>
            <Label>Type</Label>
            <select {...register('type', { required: true })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="physical">Physical</option>
              <option value="diet">Diet</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea {...register('description', { required: true })} placeholder="30 min walk daily…" rows={2} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createRec.isPending}>Save</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { reset(); setShowForm(false) }}>Cancel</Button>
          </div>
        </form>
      )}

      {recommendations?.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No recommendations recorded.</p>
      )}

      <div className="space-y-2">
        {recommendations?.map(rec => (
          <div key={rec.id} className="flex items-start gap-3 p-3 border rounded-lg">
            <Badge variant={typeColors[rec.type] ?? 'outline'} className="mt-0.5">{rec.type}</Badge>
            <p className="text-sm flex-1">{rec.description}</p>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive flex-shrink-0"
              onClick={() => deleteRec.mutate(rec.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/AttachmentSection.tsx`**

```typescript
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAttachments, useUploadAttachment, useDeleteAttachment, usePresignedUrl } from '@/hooks/useAttachments'
import { Paperclip, Download, Trash2, Upload } from 'lucide-react'

interface Props { visitId: string }

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentSection({ visitId }: Props) {
  const { data: attachments } = useAttachments(visitId)
  const upload = useUploadAttachment(visitId)
  const deleteAtt = useDeleteAttachment(visitId)
  const presign = usePresignedUrl()
  const fileInput = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await upload.mutateAsync({ file, fileType: 'other' })
    if (fileInput.current) fileInput.current.value = ''
  }

  const handleDownload = async (attachmentId: string, displayName: string) => {
    const { url } = await presign.mutateAsync({ visitId, attachmentId })
    const a = document.createElement('a')
    a.href = url
    a.download = displayName
    a.click()
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">Attachments</h3>
        <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}
          disabled={upload.isPending}>
          <Upload className="h-4 w-4 mr-1" />
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </Button>
        <input ref={fileInput} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {attachments?.length === 0 && (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      )}

      <div className="space-y-2">
        {attachments?.map(att => (
          <div key={att.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{att.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {att.fileType && <span className="capitalize">{att.fileType} · </span>}
                {formatBytes(att.sizeBytes)}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8"
              onClick={() => handleDownload(att.id, att.displayName)}>
              <Download className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
              onClick={() => deleteAtt.mutate(att.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Replace stub `frontend/src/pages/VisitDetailPage.tsx`**

```typescript
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useVisit, useDeleteVisit } from '@/hooks/useVisits'
import { MedicationSection } from '@/components/MedicationSection'
import { RecommendationSection } from '@/components/RecommendationSection'
import { AttachmentSection } from '@/components/AttachmentSection'
import { Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

export function VisitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: visit, isLoading } = useVisit(id!)
  const deleteVisit = useDeleteVisit()

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>
  if (!visit) return <div className="text-center py-12 text-destructive">Visit not found.</div>

  const handleDelete = async () => {
    if (!confirm('Delete this visit and all its data?')) return
    await deleteVisit.mutateAsync(id!)
    navigate('/')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            {format(new Date(visit.visitDate), 'dd MMMM yyyy')}
          </p>
          <h1 className="text-2xl font-bold">
            {visit.doctorName ?? 'Unknown Doctor'}
            {visit.specialty && <span className="text-lg font-normal text-muted-foreground ml-2">· {visit.specialty}</span>}
          </h1>
          {visit.clinic && <p className="text-sm text-muted-foreground">{visit.clinic}</p>}
        </div>
        <Button variant="outline" size="icon" onClick={() => navigate(`/visits/${id}/edit`)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="text-destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {(visit.chiefComplaint || visit.diagnosis || visit.notes) && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {visit.chiefComplaint && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Chief Complaint</p>
                <p className="text-sm">{visit.chiefComplaint}</p>
              </div>
            )}
            {visit.diagnosis && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Diagnosis</p>
                <p className="text-sm">{visit.diagnosis}</p>
              </div>
            )}
            {visit.notes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{visit.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <MedicationSection visitId={id!} />
      <RecommendationSection visitId={id!} />
      <AttachmentSection visitId={id!} />
    </div>
  )
}
```

- [ ] **Step 6: Build to verify**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend/src/
git commit -m "feat: add visit detail page with medications, recommendations, attachments sections"
```

---

## Task 8: Search Page + Push Hook + NavBar

**Files:**
- Modify: `frontend/src/pages/SearchPage.tsx`
- Create: `frontend/src/hooks/usePush.ts`
- Modify: `frontend/src/components/NavBar.tsx`

- [ ] **Step 1: Create `frontend/src/hooks/usePush.ts`**

```typescript
import { api } from '@/lib/api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export function usePush() {
  const requestPermissionAndSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported in this browser')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const registration = await navigator.serviceWorker.ready

    const existing = await registration.pushManager.getSubscription()
    if (existing) return   // already subscribed

    const { publicKey } = await api.get<{ publicKey: string }>('/push/public-key')
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }

    await api.post('/push/subscribe', { endpoint, p256dh: keys.p256dh, auth: keys.auth })
  }

  return { requestPermissionAndSubscribe }
}
```

- [ ] **Step 2: Replace stub `frontend/src/pages/SearchPage.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { VisitCard } from '@/components/VisitCard'
import { useSearchVisits } from '@/hooks/useVisits'
import { Search } from 'lucide-react'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const { data: results, isLoading } = useSearchVisits(query)
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search diagnosis, doctor, medications…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {isLoading && query.length > 1 && (
        <p className="text-center text-muted-foreground">Searching…</p>
      )}

      {results && results.length === 0 && query.length > 1 && (
        <p className="text-center text-muted-foreground">No results for "{query}"</p>
      )}

      <div className="space-y-3">
        {results?.map(visit => (
          <VisitCard key={visit.id} visit={visit} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace stub `frontend/src/components/NavBar.tsx`**

```typescript
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useCurrentUser, useLogout } from '@/hooks/useAuth'
import { Search, Clock, LogOut } from 'lucide-react'

export function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: user } = useCurrentUser()
  const logout = useLogout()

  return (
    <nav className="border-b bg-background sticky top-0 z-10">
      <div className="container mx-auto px-4 max-w-3xl flex items-center justify-between h-14">
        <button
          onClick={() => navigate('/')}
          className="font-semibold text-lg hover:text-primary transition-colors"
        >
          MedHistory
        </button>

        <div className="flex items-center gap-1">
          <Button
            variant={location.pathname === '/' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => navigate('/')}
            title="Timeline"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant={location.pathname === '/search' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => navigate('/search')}
            title="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="h-8 w-8 rounded-full cursor-pointer ml-1"
              title={user.name}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium ml-1">
              {user?.name?.[0] ?? '?'}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout.mutate()}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Build to verify**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/
git commit -m "feat: add search page, push hook, and full NavBar"
```

---

## Task 9: Service Worker

**Files:**
- Create: `frontend/public/sw.js`

- [ ] **Step 1: Create `frontend/public/sw.js`**

```javascript
self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'MedHistory', body: event.data.text() };
  }

  const options = {
    body: data.body ?? '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'medication-reminder',
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'MedHistory', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
```

- [ ] **Step 2: Verify the service worker is in the build output**

```bash
cd frontend && npm run build && ls ../src/main/resources/static/sw.js
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/public/sw.js
git commit -m "feat: add service worker for push notification handling"
```

---

## Task 10: Maven Build Integration

**Files:**
- Modify: `pom.xml`

- [ ] **Step 1: Add `frontend-maven-plugin` to `pom.xml`**

Inside the `<build><plugins>` section (after the existing spring-boot-maven-plugin), add:

```xml
<plugin>
    <groupId>com.github.eirslett</groupId>
    <artifactId>frontend-maven-plugin</artifactId>
    <version>1.15.0</version>
    <configuration>
        <workingDirectory>frontend</workingDirectory>
        <installDirectory>target</installDirectory>
        <nodeVersion>v20.15.0</nodeVersion>
        <npmVersion>10.7.0</npmVersion>
    </configuration>
    <executions>
        <execution>
            <id>install-node-and-npm</id>
            <goals><goal>install-node-and-npm</goal></goals>
        </execution>
        <execution>
            <id>npm-install</id>
            <goals><goal>npm</goal></goals>
            <configuration><arguments>install</arguments></configuration>
        </execution>
        <execution>
            <id>npm-build</id>
            <goals><goal>npm</goal></goals>
            <configuration><arguments>run build</arguments></configuration>
        </execution>
    </executions>
</plugin>
```

Note: the Vite build outputs directly to `src/main/resources/static/` (configured in `vite.config.ts`), so no separate resource copy plugin is needed.

- [ ] **Step 2: Verify the full build from scratch**

```bash
mvn clean package -DskipTests -q 2>&1 | tail -10
```

Expected: `BUILD SUCCESS`. The JAR at `target/medhistory.jar` is produced.

- [ ] **Step 3: Test the JAR runs and serves the frontend**

```bash
java -jar target/medhistory.jar --spring.profiles.active=local \
  --app.jwt.secret=test-secret-that-is-at-least-32-characters-long \
  --app.vapid.public-key=placeholder \
  --app.vapid.private-key=placeholder &

sleep 5
curl -s http://localhost:8080/ | head -5   # should return HTML
curl -s http://localhost:8080/actuator/health | python3 -m json.tool
kill %1
```

Expected: HTML response for `/`, `{"status":"UP"}` for health.

- [ ] **Step 4: Commit**

```bash
git add pom.xml
git commit -m "feat: integrate frontend-maven-plugin for single-JAR build"
```

---

## Task 11: Dockerfile + fly.toml

**Files:**
- Create: `Dockerfile`
- Create: `fly.toml`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# Build stage
FROM maven:3.9.8-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
COPY frontend ./frontend
RUN mvn clean package -DskipTests -q

# Run stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/medhistory.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar", "--spring.profiles.active=prod"]
```

- [ ] **Step 2: Create `fly.toml`**

```toml
app = "medhistory"
primary_region = "sin"   # Singapore — change to region nearest to you

[build]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

  [http_service.concurrency]
    type = "requests"
    hard_limit = 250
    soft_limit = 200

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"

[checks]
  [checks.health]
    grace_period = "30s"
    interval = "15s"
    method = "GET"
    path = "/actuator/health"
    port = 8080
    timeout = "5s"
    type = "http"
```

- [ ] **Step 3: Verify Docker build**

```bash
docker build -t medhistory:local . 2>&1 | tail -5
```

Expected: `Successfully tagged medhistory:local`

- [ ] **Step 4: Commit**

```bash
git add Dockerfile fly.toml
git commit -m "feat: add Dockerfile and Fly.io deployment config"
```

---

## Task 12: README.md + SETUP.md

**Files:**
- Create: `README.md`
- Create: `SETUP.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# MedHistory

A personal medical history manager — track your doctor visits, prescriptions, recommendations, and imaging reports. Search your history instantly. Get medication reminders via browser push notifications.

## Features

- **Visit timeline** — all doctor visits in chronological order, grouped by year
- **Medications** — name, dosage, frequency, duration; track what worked and what didn't
- **Recommendations** — physical, diet, or other advice from your doctor
- **Attachments** — upload prescriptions, lab reports, and imaging files
- **Full-text search** — find any visit by diagnosis, doctor name, medication, or note
- **Medication reminders** — browser push notifications at your chosen time
- **Full audit history** — every change is recorded via Hibernate Envers
- **Multi-user** — each user manages their own private records

## Architecture

```
Browser (React + Vite + shadcn/ui)
        │  HTTPS + JWT (httpOnly cookie)
        ▼
Spring Boot 3.x (single fat JAR)
   ├── REST API at /api/**
   ├── PostgreSQL  — structured data + full-text search
   ├── Cloudflare R2 / MinIO — file attachments
   └── Web Push (VAPID) — medication reminders
```

One `mvn package` builds the frontend and embeds it in the JAR. One `java -jar` runs everything.

## Tech Stack

**Backend:** Java 21 · Spring Boot 3.3 · Spring Security OAuth2 · JWT · Hibernate Envers · Flyway · AWS SDK v2 · Web Push VAPID · Micrometer/Prometheus

**Frontend:** React 18 · Vite · TypeScript · shadcn/ui · Tailwind CSS · TanStack Query · React Router v6

**Infrastructure:** PostgreSQL 16 · Cloudflare R2 (prod) / MinIO (local) · Fly.io · Neon (prod DB)

## Quick Start (Local)

See [SETUP.md](SETUP.md) for full instructions.

```bash
docker compose up -d
cp .env.local.example .env.local   # fill in Google OAuth + JWT secret
source .env.local
mvn spring-boot:run -Dspring-boot.run.profiles=local
# Frontend dev server (hot reload):
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 → Sign in with Google.

## Deploy to Production

See the [Deployment section in SETUP.md](SETUP.md#production-deployment).

## Observability

- Health: `GET /actuator/health`
- Prometheus metrics: `GET /actuator/prometheus`
- Structured JSON logs in production (Logback)
- Correlation ID on every request (`X-Correlation-Id` response header)
```

- [ ] **Step 2: Create `SETUP.md`**

```markdown
# Setup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Java | 21+ | [adoptium.net](https://adoptium.net) |
| Maven | 3.9+ | [maven.apache.org](https://maven.apache.org) |
| Docker | 24+ | [docker.com](https://docker.com) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) (optional — Maven installs it automatically) |

---

## Local Development

### 1. Clone and start Docker services

```bash
git clone <repo-url>
cd team-hub
docker compose up -d
docker compose ps   # both services should show "healthy"
```

### 2. Create the MinIO bucket

```bash
docker exec medhistory-minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec medhistory-minio mc mb local/medhistory
```

### 3. Configure Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add Authorized redirect URI: `http://localhost:8080/login/oauth2/code/google`
4. Copy the Client ID and Client Secret

### 4. Generate a JWT secret

```bash
openssl rand -base64 64
```

### 5. Generate VAPID keys

```bash
# Option A: use the web-push CLI (install once)
npm install -g web-push
web-push generate-vapid-keys

# Option B: run the Spring Boot app once with placeholder keys
# and generate them programmatically in a test
```

### 6. Create `.env.local`

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in all values:

```bash
GOOGLE_CLIENT_ID=<from step 3>
GOOGLE_CLIENT_SECRET=<from step 3>
JWT_SECRET=<from step 4>
VAPID_PUBLIC_KEY=<from step 5>
VAPID_PRIVATE_KEY=<from step 5>
R2_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY=minioadmin
R2_SECRET_KEY=minioadmin
R2_BUCKET=medhistory
```

### 7. Run the backend

```bash
source .env.local
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Expected: `Started MedhistoryApplication in X seconds`

Health check: http://localhost:8080/actuator/health

### 8. Run the frontend dev server (hot reload)

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

The Vite dev server proxies `/api/**` and `/oauth2/**` to the Spring Boot backend automatically.

### 9. Build the single JAR (optional)

```bash
mvn clean package -DskipTests
java -jar target/medhistory.jar --spring.profiles.active=local
```

---

## Production Deployment

### Services needed

| Service | Purpose | Cost |
|---------|---------|------|
| [Fly.io](https://fly.io) | Runs the Spring Boot JAR | Free tier (3 shared VMs) |
| [Neon](https://neon.tech) | PostgreSQL database | Free tier (0.5GB) |
| [Cloudflare R2](https://cloudflare.com/r2) | File storage | Free tier (10GB) |
| [Google Cloud Console](https://console.cloud.google.com) | OAuth2 | Free |

### Step 1: Set up Neon

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project → copy the **Connection string** (format: `postgresql://...`)

### Step 2: Set up Cloudflare R2

1. Log in to Cloudflare dashboard → R2 → Create bucket `medhistory`
2. Go to **Manage R2 API Tokens** → Create token with **Object Read & Write** on the bucket
3. Copy: Access Key ID, Secret Access Key, Account ID
4. Your R2 endpoint: `https://<account-id>.r2.cloudflarestorage.com`
5. Set CORS policy on the bucket to allow your Fly.io domain:

```json
[{
  "AllowedOrigins": ["https://medhistory.fly.dev"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}]
```

### Step 3: Set up Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Log in
fly auth login

# Launch (first time only — say NO to Postgres, we use Neon)
fly launch --no-deploy

# Set all secrets
fly secrets set \
  DATABASE_URL="<neon-connection-string>?sslmode=require" \
  GOOGLE_CLIENT_ID="<prod-client-id>" \
  GOOGLE_CLIENT_SECRET="<prod-client-secret>" \
  JWT_SECRET="$(openssl rand -base64 64)" \
  VAPID_PUBLIC_KEY="<vapid-public-key>" \
  VAPID_PRIVATE_KEY="<vapid-private-key>" \
  R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com" \
  R2_ACCESS_KEY="<r2-access-key>" \
  R2_SECRET_KEY="<r2-secret-key>" \
  R2_BUCKET="medhistory" \
  FRONTEND_URL="https://medhistory.fly.dev"
```

### Step 4: Configure Google OAuth for production

1. In Google Cloud Console, add the production redirect URI:
   `https://medhistory.fly.dev/login/oauth2/code/google`
2. Add `https://medhistory.fly.dev` as an authorized JavaScript origin

### Step 5: Deploy

```bash
mvn clean package -DskipTests   # builds frontend + backend JAR
docker build -t registry.fly.io/medhistory:latest .
fly deploy
```

Or use the single command (after first deploy):

```bash
fly deploy --build-arg SKIP_TESTS=true
```

### Step 6: Verify

```bash
fly logs                                              # view live logs
curl https://medhistory.fly.dev/actuator/health       # should return UP
```

---

## Useful Commands

```bash
# Local
docker compose up -d          # start Postgres + MinIO
docker compose down           # stop
docker compose logs -f        # view logs

# Backend
mvn test                      # run all tests
mvn spring-boot:run -Dspring-boot.run.profiles=local   # run locally

# Frontend
cd frontend && npm run dev    # dev server with hot reload
cd frontend && npm run build  # production build

# Production
fly logs                      # stream logs
fly ssh console               # SSH into the running machine
fly secrets list              # list secret names (not values)
fly status                    # machine status
```

---

## Troubleshooting

**OAuth2 redirect_uri_mismatch:** The redirect URI registered in Google Cloud Console must exactly match what Spring uses. For local: `http://localhost:8080/login/oauth2/code/google`. For prod: `https://<your-domain>/login/oauth2/code/google`.

**MinIO bucket not found:** Run the `mc mb` command from Task 2, Step 4 of Plan 1.

**Flyway migration fails on startup:** Check the error in logs (`fly logs`). Usually a SQL syntax issue or a migration already applied partially. Connect to Neon console and inspect the `flyway_schema_history` table.

**Push notifications not working:** Ensure the service worker is registered (`sw.js` is served at `/sw.js`). Check browser console for subscription errors. The VAPID public key must match between backend config and the key used to subscribe.
```

- [ ] **Step 3: Build the complete JAR one final time to confirm everything works end-to-end**

```bash
mvn clean package -DskipTests -q 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`

- [ ] **Step 4: Commit**

```bash
git add README.md SETUP.md
git commit -m "docs: add comprehensive README and SETUP guide"
```

---

## Task 13: Final End-to-End Smoke Test

- [ ] **Step 1: Start Docker Compose**

```bash
docker compose up -d
```

- [ ] **Step 2: Run the production JAR locally**

```bash
source .env.local
java -jar target/medhistory.jar --spring.profiles.active=local
```

- [ ] **Step 3: Open the app and test the full flow**

Open http://localhost:8080 in a browser.

Test checklist:
- [ ] Login page appears → click "Sign in with Google" → OAuth flow completes → redirected to timeline
- [ ] NavBar shows your profile avatar and name
- [ ] Click "Add Visit" → fill form → save → redirected to visit detail page
- [ ] Add a medication on the visit detail page → appears in list
- [ ] Set a reminder on the medication → browser requests notification permission → reminder saved
- [ ] Add a recommendation → appears with correct type badge
- [ ] Upload a file (any PDF or image) → appears in attachments list → download link opens the file
- [ ] Click Search → type a term from the diagnosis or doctor name → results appear
- [ ] Edit the visit → change diagnosis → save → change appears on detail page
- [ ] Delete the medication → gone from list
- [ ] Timeline shows the visit grouped by year with medication count

- [ ] **Step 4: Run the full test suite**

```bash
mvn test -q 2>&1 | tail -10
```

Expected: all tests pass, 0 failures.

- [ ] **Step 5: Final commit**

```bash
git add .
git status   # verify nothing unexpected is staged
git commit -m "chore: final end-to-end smoke test complete — all features working"
```

---

## Done ✓

All three plans are complete when:
- `mvn clean package` produces `target/medhistory.jar` with the frontend embedded
- The app starts with a single `java -jar` command
- All features work: auth, timeline, visit CRUD, medications + reminders, recommendations, attachments, search, push notifications
- `mvn test` passes with 0 failures
- `README.md` and `SETUP.md` are complete and accurate
- `Dockerfile` builds a production image
- `fly.toml` is ready for `fly deploy`
