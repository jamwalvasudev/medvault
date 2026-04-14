# Ant Design Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace shadcn/ui + Tailwind CSS with Ant Design v5 across all frontend pages, keeping the same layout structure (collapsible sidebar, bottom mobile nav, tabs in visit detail).

**Architecture:** Full dependency swap first (breaks the build), then migrate AppShell → PageHeader → pages simplest-to-hardest. Build is restored after Task 9. All inline styles replace Tailwind classes; AntD components replace shadcn components one-for-one per the spec mapping.

**Tech Stack:** antd v5, @ant-design/icons, React, TypeScript, Vite, React Router

---

### Task 1: Dependency swap + file cleanup

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/main.tsx`
- Delete: `frontend/src/components/ui/` (entire directory)
- Delete: `frontend/src/lib/` (entire directory)
- Delete: `frontend/components.json`

- [ ] **Step 1: Install AntD and icons**

```bash
cd /Users/vasudev.jamwal/bench/personal/team-hub/frontend && npm install antd @ant-design/icons
```

- [ ] **Step 2: Remove shadcn/Tailwind packages**

```bash
npm uninstall radix-ui shadcn class-variance-authority tailwind-merge clsx tailwindcss @tailwindcss/vite lucide-react sonner
```

- [ ] **Step 3: Delete shadcn component files and utils**

```bash
rm -rf src/components/ui src/lib components.json
```

- [ ] **Step 4: Update `frontend/vite.config.ts`** — remove the tailwindcss import and plugin

Replace the entire file with:

```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/oauth2': { target: 'http://localhost:8080', changeOrigin: true },
      '/login': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
});
```

- [ ] **Step 5: Replace `frontend/src/index.css`** — remove all Tailwind directives, keep only base reset

Replace the entire file with:

```css
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  width: 100%;
  min-height: 100svh;
}
```

- [ ] **Step 6: Read `frontend/src/main.tsx` and add AntD reset CSS import**

Read the file first, then add `import 'antd/dist/reset.css';` as the first import line. The rest of main.tsx stays unchanged.

- [ ] **Step 7: Verify package.json has antd and @ant-design/icons, and shadcn/tailwind deps are gone**

```bash
cat package.json | grep -E '"antd|@ant-design|tailwind|shadcn|lucide|sonner|radix'
```

Expected: only `antd` and `@ant-design/icons` lines appear.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: swap shadcn/Tailwind for Ant Design — deps and file cleanup"
```

Note: `npm run build` will fail after this step — expected, pages still import deleted components. This is restored by Task 9.

---

### Task 2: App.tsx — ConfigProvider + App wrapper

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Replace `frontend/src/App.tsx` entirely with:**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App, ConfigProvider, Spin } from 'antd';
import { AuthProvider, useAuth } from './AuthContext';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VisitDetailPage from './pages/VisitDetailPage';
import VisitFormPage from './pages/VisitFormPage';
import SearchPage from './pages/SearchPage';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/visits/new" element={<VisitFormPage />} />
        <Route path="/visits/:id" element={<VisitDetailPage />} />
        <Route path="/visits/:id/edit" element={<VisitFormPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function Root() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 8 } }}>
      <App>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </App>
    </ConfigProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(antd): wrap app in ConfigProvider + App for theme and message context"
```

---

### Task 3: AppShell — AntD Layout + Sider + Menu

**Files:**
- Modify: `frontend/src/components/AppShell.tsx`

- [ ] **Step 1: Replace `frontend/src/components/AppShell.tsx` entirely with:**

```tsx
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, Flex, Grid, Layout, Menu, Typography } from 'antd';
import { HomeOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '@/AuthContext';

const { Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const navItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">Home</Link> },
  { key: '/search', icon: <SearchOutlined />, label: <Link to="/search">Search</Link> },
];

const mobileNavItems = [
  { href: '/', icon: <HomeOutlined />, label: 'Home' },
  { href: '/search', icon: <SearchOutlined />, label: 'Search' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const screens = useBreakpoint();

  const selectedKey =
    pathname === '/'
      ? '/'
      : navItems.find((i) => i.key !== '/' && pathname.startsWith(i.key))?.key ?? '/';

  const showSidebar = !!screens.md;
  const collapsed = !screens.lg;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {showSidebar && (
        <Sider
          theme="dark"
          collapsed={collapsed}
          collapsedWidth={64}
          width={200}
          style={{ position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 30 }}
        >
          {/* Logo */}
          <Flex
            align="center"
            style={{
              height: 64,
              padding: '0 20px',
              borderBottom: '1px solid #1e293b',
              flexShrink: 0,
            }}
          >
            <Typography.Text style={{ color: '#f8fafc', fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap' }}>
              {collapsed ? 'M' : 'MedHistory'}
            </Typography.Text>
          </Flex>

          {/* Nav */}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={navItems}
            style={{ borderRight: 0, flex: 1 }}
          />

          {/* User */}
          <Flex
            align="center"
            gap={8}
            style={{ padding: 12, borderTop: '1px solid #1e293b', flexShrink: 0 }}
          >
            <Avatar src={user?.picture} size={32} style={{ flexShrink: 0 }}>
              {!user?.picture && user?.name?.[0]}
            </Avatar>
            {!collapsed && (
              <Typography.Text
                style={{ color: '#64748b', fontSize: 12 }}
                ellipsis={{ tooltip: user?.name }}
              >
                {user?.name}
              </Typography.Text>
            )}
          </Flex>
        </Sider>
      )}

      <Layout style={{ marginLeft: showSidebar ? (collapsed ? 64 : 200) : 0, paddingBottom: showSidebar ? 0 : 64 }}>
        <Content>{children}</Content>
      </Layout>

      {/* Mobile bottom nav */}
      {!showSidebar && (
        <nav
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            background: '#0f172a',
            borderTop: '1px solid #1e293b',
            zIndex: 30,
          }}
        >
          {mobileNavItems.map(({ href, icon, label }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: active ? '#4f46e5' : '#64748b',
                  fontSize: 12,
                  padding: '8px 24px',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/AppShell.tsx
git commit -m "feat(antd): rewrite AppShell with AntD Layout + Sider + Menu"
```

---

### Task 4: PageHeader — AntD Flex + Typography + Button

**Files:**
- Modify: `frontend/src/components/PageHeader.tsx`

- [ ] **Step 1: Replace `frontend/src/components/PageHeader.tsx` entirely with:**

```tsx
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Flex, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface PageHeaderProps {
  title: string;
  backHref?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, backHref, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <Flex
      align="center"
      justify="space-between"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        height: 64,
        padding: '0 24px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0,
      }}
    >
      <Flex align="center" gap={4}>
        {backHref && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(backHref)}
            style={{ marginLeft: -8 }}
          />
        )}
        <Typography.Title level={5} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
      </Flex>
      {actions && (
        <Flex align="center" gap={8}>
          {actions}
        </Flex>
      )}
    </Flex>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PageHeader.tsx
git commit -m "feat(antd): rewrite PageHeader with AntD Flex + Typography + Button"
```

---

### Task 5: LoginPage

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Replace `frontend/src/pages/LoginPage.tsx` entirely with:**

```tsx
import { Button, Card, Typography } from 'antd';

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 16,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            MedHistory
          </Typography.Title>
          <Typography.Text type="secondary">
            Your personal medical record, organised.
          </Typography.Text>
        </div>
        <Button type="primary" size="large" block href="/oauth2/authorization/google">
          Sign in with Google
        </Button>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx
git commit -m "feat(antd): migrate LoginPage to AntD Card + Button + Typography"
```

---

### Task 6: DashboardPage

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Replace `frontend/src/pages/DashboardPage.tsx` entirely with:**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Flex, Skeleton, Tag, Typography } from 'antd';
import { EnvironmentOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { api, type Visit } from '@/api';
import PageHeader from '@/components/PageHeader';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.visits
      .list()
      .then((v) => { setVisits(v); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const byYear = visits.reduce<Record<string, Visit[]>>((acc, v) => {
    const year = v.visitDate.slice(0, 4);
    (acc[year] ??= []).push(v);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PageHeader
        title="Your Visits"
        actions={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => navigate('/visits/new')}>
            Add Visit
          </Button>
        }
      />
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 672,
          margin: '0 auto',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {error && <Alert type="error" message={error} showIcon />}

        {loading ? (
          <Flex vertical gap={12}>
            {[1, 2, 3].map((i) => <Skeleton key={i} active />)}
          </Flex>
        ) : visits.length === 0 ? (
          <Flex vertical align="center" justify="center" style={{ paddingTop: 80, paddingBottom: 80, gap: 16 }}>
            <Typography.Text type="secondary">No visits yet.</Typography.Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/visits/new')}>
              Add your first visit
            </Button>
          </Flex>
        ) : (
          years.map((year) => (
            <section key={year}>
              <Typography.Text
                type="secondary"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 12,
                }}
              >
                {year}
              </Typography.Text>
              <Flex vertical gap={8}>
                {byYear[year].map((v) => (
                  <Card
                    key={v.id}
                    hoverable
                    onClick={() => navigate(`/visits/${v.id}`)}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Flex justify="space-between" align="flex-start" gap={16}>
                      <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
                        <Flex align="center" gap={8} wrap="wrap">
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {v.visitDate}
                          </Typography.Text>
                          {v.specialty && <Tag bordered={false}>{v.specialty}</Tag>}
                        </Flex>
                        <Typography.Text strong style={{ fontSize: 14 }}>
                          {v.doctorName}
                        </Typography.Text>
                        {v.clinic && (
                          <Flex align="center" gap={4}>
                            <EnvironmentOutlined style={{ fontSize: 12, color: '#94a3b8' }} />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {v.clinic}
                            </Typography.Text>
                          </Flex>
                        )}
                        {v.diagnosis && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                            {v.diagnosis}
                          </Typography.Text>
                        )}
                      </Flex>
                      <RightOutlined style={{ color: '#94a3b8', marginTop: 2, flexShrink: 0 }} />
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat(antd): migrate DashboardPage to AntD Card + Tag + Skeleton + Alert"
```

---

### Task 7: SearchPage

**Files:**
- Modify: `frontend/src/pages/SearchPage.tsx`

- [ ] **Step 1: Replace `frontend/src/pages/SearchPage.tsx` entirely with:**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Flex, Input, Skeleton, Tag, Typography } from 'antd';
import { EnvironmentOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { api, type Visit } from '@/api';
import PageHeader from '@/components/PageHeader';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Visit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await api.visits.search(query);
      setResults(r);
      setSearched(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PageHeader title="Search" backHref="/" />
      <main
        style={{
          width: '100%',
          maxWidth: 672,
          margin: '0 auto',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <form onSubmit={handleSearch}>
          <Flex gap={8}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Search visits, doctors, diagnoses…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              style={{ flex: 1 }}
            />
            <Button type="primary" htmlType="submit" loading={loading}>
              Search
            </Button>
          </Flex>
        </form>

        {error && <Alert type="error" message={error} showIcon />}

        {loading ? (
          <Flex vertical gap={12}>
            {[1, 2, 3].map((i) => <Skeleton key={i} active />)}
          </Flex>
        ) : searched && results.length === 0 ? (
          <Typography.Text
            type="secondary"
            style={{ textAlign: 'center', display: 'block', padding: '32px 0' }}
          >
            No results for "{query}"
          </Typography.Text>
        ) : (
          <Flex vertical gap={8}>
            {results.map((v) => (
              <Card
                key={v.id}
                hoverable
                onClick={() => navigate(`/visits/${v.id}`)}
                styles={{ body: { padding: 16 } }}
              >
                <Flex justify="space-between" align="flex-start" gap={16}>
                  <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
                    <Flex align="center" gap={8} wrap="wrap">
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {v.visitDate}
                      </Typography.Text>
                      {v.specialty && <Tag bordered={false}>{v.specialty}</Tag>}
                    </Flex>
                    <Typography.Text strong style={{ fontSize: 14 }}>
                      {v.doctorName}
                    </Typography.Text>
                    {v.clinic && (
                      <Flex align="center" gap={4}>
                        <EnvironmentOutlined style={{ fontSize: 12, color: '#94a3b8' }} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {v.clinic}
                        </Typography.Text>
                      </Flex>
                    )}
                    {v.diagnosis && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                        {v.diagnosis}
                      </Typography.Text>
                    )}
                  </Flex>
                  <RightOutlined style={{ color: '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/SearchPage.tsx
git commit -m "feat(antd): migrate SearchPage to AntD Input + Card + Tag + Skeleton"
```

---

### Task 8: VisitFormPage

**Files:**
- Modify: `frontend/src/pages/VisitFormPage.tsx`

- [ ] **Step 1: Replace `frontend/src/pages/VisitFormPage.tsx` entirely with:**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Button, Card, Flex, Input, Select, Typography } from 'antd';
import { api, type VisitRequest } from '@/api';
import PageHeader from '@/components/PageHeader';

const empty: VisitRequest = {
  visitDate: new Date().toISOString().slice(0, 10),
  doctorName: '',
  specialty: '',
  clinic: '',
  chiefComplaint: '',
  diagnosis: '',
  notes: '',
};

export default function VisitFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<VisitRequest>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [specialties, setSpecialties] = useState<{ id: number; name: string }[]>([]);
  const [specialtyFailed, setSpecialtyFailed] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const specialtyInitializedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    api.visits.get(id).then((v) => {
      setForm({
        visitDate: v.visitDate,
        doctorName: v.doctorName,
        specialty: v.specialty ?? '',
        clinic: v.clinic ?? '',
        chiefComplaint: v.chiefComplaint ?? '',
        diagnosis: v.diagnosis ?? '',
        notes: v.notes ?? '',
      });
    }).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    api.specialties.list()
      .then(setSpecialties)
      .catch(() => setSpecialtyFailed(true));
  }, []);

  useEffect(() => {
    if (specialtyInitializedRef.current || specialties.length === 0) return;
    if (isEdit && !form.specialty) return;
    const match = specialties.find((s) => s.name === form.specialty);
    setSelectValue(match ? (form.specialty ?? '') : (form.specialty ? '__other__' : ''));
    if (form.specialty && !match) setCustomSpecialty(form.specialty);
    specialtyInitializedRef.current = true;
  }, [specialties, form.specialty, isEdit]);

  const field =
    (key: keyof VisitRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const effectiveSpecialty = specialtyFailed
      ? (form.specialty ?? '')
      : selectValue === '__other__'
      ? customSpecialty
      : selectValue;
    const submitData: VisitRequest = { ...form, specialty: effectiveSpecialty };
    try {
      if (isEdit && id) {
        await api.visits.update(id, submitData);
        message.success('Visit updated');
        navigate(`/visits/${id}`);
      } else {
        const v = await api.visits.create(submitData);
        message.success('Visit saved');
        navigate(`/visits/${v.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const specialtyOptions = [
    ...specialties.map((s) => ({ value: s.name, label: s.name })),
    { value: '__other__', label: 'Other…' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PageHeader
        title={isEdit ? 'Edit Visit' : 'New Visit'}
        backHref={isEdit ? `/visits/${id}` : '/'}
      />
      <main style={{ width: '100%', maxWidth: 672, margin: '0 auto', padding: '24px 16px' }}>
        <Card>
          <form onSubmit={handleSubmit}>
            <Flex vertical gap={20}>
              {error && <Alert type="error" message={error} showIcon />}

              <Flex gap={16} wrap="wrap">
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 200 }}>
                  <Typography.Text strong>Date *</Typography.Text>
                  <Input type="date" required value={form.visitDate} onChange={field('visitDate')} />
                </Flex>
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 200 }}>
                  <Typography.Text strong>Doctor *</Typography.Text>
                  <Input placeholder="Dr. Smith" required value={form.doctorName} onChange={field('doctorName')} />
                </Flex>
              </Flex>

              <Flex gap={16} wrap="wrap">
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 200 }}>
                  <Typography.Text strong>Specialty</Typography.Text>
                  {specialtyFailed ? (
                    <Input placeholder="GP, Cardiology…" value={form.specialty ?? ''} onChange={field('specialty')} />
                  ) : (
                    <Flex vertical gap={8}>
                      <Select
                        placeholder="— select specialty —"
                        value={selectValue || undefined}
                        onChange={(val) => {
                          setSelectValue(val);
                          if (val !== '__other__') setCustomSpecialty('');
                        }}
                        options={specialtyOptions}
                        style={{ width: '100%' }}
                      />
                      {selectValue === '__other__' && (
                        <Input
                          placeholder="Enter specialty"
                          value={customSpecialty}
                          onChange={(e) => setCustomSpecialty(e.target.value)}
                        />
                      )}
                    </Flex>
                  )}
                </Flex>
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 200 }}>
                  <Typography.Text strong>Clinic / Hospital</Typography.Text>
                  <Input placeholder="City General Hospital" value={form.clinic ?? ''} onChange={field('clinic')} />
                </Flex>
              </Flex>

              <Flex vertical gap={6}>
                <Typography.Text strong>Chief Complaint</Typography.Text>
                <Input placeholder="Why you visited" value={form.chiefComplaint ?? ''} onChange={field('chiefComplaint')} />
              </Flex>

              <Flex vertical gap={6}>
                <Typography.Text strong>Diagnosis</Typography.Text>
                <Input placeholder="Diagnosis / findings" value={form.diagnosis ?? ''} onChange={field('diagnosis')} />
              </Flex>

              <Flex vertical gap={6}>
                <Typography.Text strong>Notes</Typography.Text>
                <Input.TextArea placeholder="Additional notes…" rows={4} value={form.notes ?? ''} onChange={field('notes')} />
              </Flex>

              <Flex justify="flex-end" gap={12}>
                <Button onClick={() => navigate(isEdit ? `/visits/${id}` : '/')}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Save Visit
                </Button>
              </Flex>
            </Flex>
          </form>
        </Card>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/VisitFormPage.tsx
git commit -m "feat(antd): migrate VisitFormPage to AntD Input + Select + Button"
```

---

### Task 9: VisitDetailPage + verify build

**Files:**
- Modify: `frontend/src/pages/VisitDetailPage.tsx`

- [ ] **Step 1: Replace `frontend/src/pages/VisitDetailPage.tsx` entirely with:**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BellOutlined, CloseOutlined, DeleteOutlined, EnvironmentOutlined,
  FileOutlined, FileTextOutlined, MedicineBoxOutlined, PaperClipOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert, App, Button, Card, Divider, Flex, Input, Skeleton, Switch, Tabs, Tag, Typography,
} from 'antd';
import {
  api,
  type Attachment, type Medication, type MedicationReminder, type MedicationRequest,
  type Recommendation, type RecommendationRequest, type Visit,
} from '@/api';
import PageHeader from '@/components/PageHeader';

const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1_048_576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1_048_576).toFixed(1)} MB`;

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [visit, setVisit] = useState<Visit | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showMedForm, setShowMedForm] = useState(false);
  const [medForm, setMedForm] = useState<MedicationRequest>({ name: '' });
  const [savingMed, setSavingMed] = useState(false);

  const [showRecForm, setShowRecForm] = useState(false);
  const [recForm, setRecForm] = useState<RecommendationRequest>({ title: '' });
  const [savingRec, setSavingRec] = useState(false);

  const [reminderTime, setReminderTime] = useState<Record<string, string>>({});
  const [savingReminder, setSavingReminder] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.visits.get(id),
      api.medications.list(id),
      api.recommendations.list(id),
      api.attachments.list(id),
      api.reminders.list(),
    ]).then(([v, m, r, a, rem]) => {
      setVisit(v); setMeds(m); setRecs(r); setAttachments(a); setReminders(rem);
      setLoading(false);
    }).catch((e) => { setPageError(e.message); setLoading(false); });
  }, [id]);

  const handleDeleteVisit = () => {
    modal.confirm({
      title: 'Delete this visit?',
      content: 'This permanently removes the visit and all its medications, recommendations, and attachments. This cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        if (!id) return;
        await api.visits.delete(id).catch((e) => setPageError(e.message));
        message.success('Visit deleted');
        navigate('/');
      },
    });
  };

  const saveMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingMed(true);
    try {
      const m = await api.medications.create(id, medForm);
      setMeds((prev) => [...prev, m]);
      setMedForm({ name: '' });
      setShowMedForm(false);
      message.success('Medication added');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    } finally { setSavingMed(false); }
  };

  const deleteMed = async (medId: string) => {
    if (!id) return;
    await api.medications.delete(id, medId).catch((e) => setPageError(e.message));
    setMeds((prev) => prev.filter((m) => m.id !== medId));
    setReminders((prev) => prev.filter((r) => r.medicationId !== medId));
    message.success('Medication removed');
  };

  const saveRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingRec(true);
    try {
      const r = await api.recommendations.create(id, recForm);
      setRecs((prev) => [...prev, r]);
      setRecForm({ title: '' });
      setShowRecForm(false);
      message.success('Recommendation added');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    } finally { setSavingRec(false); }
  };

  const deleteRec = async (recId: string) => {
    if (!id) return;
    await api.recommendations.delete(id, recId).catch((e) => setPageError(e.message));
    setRecs((prev) => prev.filter((r) => r.id !== recId));
    message.success('Recommendation removed');
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const a = await api.attachments.upload(id, file);
      setAttachments((prev) => [...prev, a]);
      message.success('File uploaded');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Upload failed');
    } finally { setUploading(false); e.target.value = ''; }
  };

  const openAttachment = async (attachId: string) => {
    if (!id) return;
    try {
      const { url } = await api.attachments.presign(id, attachId);
      window.open(url, '_blank');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed to open');
    }
  };

  const deleteAttachment = async (attachId: string) => {
    if (!id) return;
    await api.attachments.delete(id, attachId).catch((e) => setPageError(e.message));
    setAttachments((prev) => prev.filter((a) => a.id !== attachId));
    message.success('Attachment removed');
  };

  const saveReminder = async (medId: string) => {
    const time = reminderTime[medId];
    if (!time) return;
    setSavingReminder(medId);
    try {
      const r = await api.reminders.create({ medicationId: medId, reminderTime: time });
      setReminders((prev) => [...prev, r]);
      setReminderTime((prev) => ({ ...prev, [medId]: '' }));
      message.success('Reminder set');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    } finally { setSavingReminder(null); }
  };

  const toggleReminder = async (remId: string) => {
    try {
      const updated = await api.reminders.toggle(remId);
      setReminders((prev) => prev.map((r) => (r.id === remId ? updated : r)));
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const deleteReminder = async (remId: string) => {
    await api.reminders.delete(remId).catch((e) => setPageError(e.message));
    setReminders((prev) => prev.filter((r) => r.id !== remId));
    message.success('Reminder removed');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <PageHeader title="Visit Detail" backHref="/" />
        <main style={{ width: '100%', maxWidth: 672, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton active />
          <Skeleton active />
          <Skeleton active />
        </main>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'medications',
      label: <Flex align="center" gap={6}><MedicineBoxOutlined /><span>Meds</span></Flex>,
      children: (
        <Flex vertical gap={12}>
          <Flex justify="flex-end">
            <Button icon={showMedForm ? <CloseOutlined /> : <PlusOutlined />} onClick={() => setShowMedForm((s) => !s)}>
              {showMedForm ? 'Cancel' : 'Add'}
            </Button>
          </Flex>
          {showMedForm && (
            <Card>
              <form onSubmit={saveMed}>
                <Flex vertical gap={12}>
                  <Input placeholder="Medication name *" required value={medForm.name}
                    onChange={(e) => setMedForm((p) => ({ ...p, name: e.target.value }))} />
                  <Flex gap={12}>
                    <Input placeholder="Dosage (e.g. 10mg)" value={medForm.dosage ?? ''}
                      onChange={(e) => setMedForm((p) => ({ ...p, dosage: e.target.value }))} />
                    <Input placeholder="Frequency (e.g. once daily)" value={medForm.frequency ?? ''}
                      onChange={(e) => setMedForm((p) => ({ ...p, frequency: e.target.value }))} />
                  </Flex>
                  <Button type="primary" htmlType="submit" loading={savingMed}>Save Medication</Button>
                </Flex>
              </form>
            </Card>
          )}
          {meds.length === 0 && !showMedForm && (
            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '24px 0' }}>
              No medications recorded.
            </Typography.Text>
          )}
          {meds.map((m) => {
            const medReminders = reminders.filter((r) => r.medicationId === m.id);
            return (
              <Card key={m.id}>
                <Flex justify="space-between" align="flex-start" gap={8}>
                  <Flex vertical gap={4}>
                    <Typography.Text strong style={{ fontSize: 14 }}>{m.name}</Typography.Text>
                    <Flex gap={4} wrap="wrap">
                      {m.dosage && <Tag>{m.dosage}</Tag>}
                      {m.frequency && <Tag>{m.frequency}</Tag>}
                    </Flex>
                  </Flex>
                  <Button type="text" danger icon={<CloseOutlined />} onClick={() => deleteMed(m.id)} />
                </Flex>
                {medReminders.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Flex vertical gap={8}>
                      {medReminders.map((r) => (
                        <Flex key={r.id} align="center" gap={8}>
                          <BellOutlined style={{ color: '#94a3b8' }} />
                          <Typography.Text type="secondary" style={{ flex: 1 }}>{r.reminderTime}</Typography.Text>
                          <Switch size="small" checked={r.enabled} onChange={() => toggleReminder(r.id)} />
                          <Button type="text" danger size="small" icon={<CloseOutlined />} onClick={() => deleteReminder(r.id)} />
                        </Flex>
                      ))}
                    </Flex>
                  </>
                )}
                <Divider style={{ margin: '12px 0' }} />
                <Flex align="center" gap={8}>
                  <Input type="time" style={{ width: 128 }}
                    value={reminderTime[m.id] ?? ''}
                    onChange={(e) => setReminderTime((p) => ({ ...p, [m.id]: e.target.value }))} />
                  <Button disabled={savingReminder === m.id || !reminderTime[m.id]} onClick={() => saveReminder(m.id)}>
                    {savingReminder === m.id ? '…' : '+ Reminder'}
                  </Button>
                </Flex>
              </Card>
            );
          })}
        </Flex>
      ),
    },
    {
      key: 'recommendations',
      label: <Flex align="center" gap={6}><FileTextOutlined /><span>Recs</span></Flex>,
      children: (
        <Flex vertical gap={12}>
          <Flex justify="flex-end">
            <Button icon={showRecForm ? <CloseOutlined /> : <PlusOutlined />} onClick={() => setShowRecForm((s) => !s)}>
              {showRecForm ? 'Cancel' : 'Add'}
            </Button>
          </Flex>
          {showRecForm && (
            <Card>
              <form onSubmit={saveRec}>
                <Flex vertical gap={12}>
                  <Input placeholder="Title *" required value={recForm.title}
                    onChange={(e) => setRecForm((p) => ({ ...p, title: e.target.value }))} />
                  <Input.TextArea placeholder="Description (optional)" rows={3}
                    value={recForm.description ?? ''}
                    onChange={(e) => setRecForm((p) => ({ ...p, description: e.target.value }))} />
                  <Input type="date" value={recForm.followUpDate ?? ''}
                    onChange={(e) => setRecForm((p) => ({ ...p, followUpDate: e.target.value }))} />
                  <Button type="primary" htmlType="submit" loading={savingRec}>Save Recommendation</Button>
                </Flex>
              </form>
            </Card>
          )}
          {recs.length === 0 && !showRecForm && (
            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '24px 0' }}>
              No recommendations recorded.
            </Typography.Text>
          )}
          {recs.map((r) => (
            <Card key={r.id}>
              <Flex justify="space-between" align="flex-start" gap={8}>
                <Flex vertical gap={4}>
                  <Typography.Text strong style={{ fontSize: 14 }}>{r.title}</Typography.Text>
                  {r.followUpDate && <Tag>Follow up: {r.followUpDate}</Tag>}
                  {r.description && <Typography.Text type="secondary">{r.description}</Typography.Text>}
                </Flex>
                <Button type="text" danger icon={<CloseOutlined />} onClick={() => deleteRec(r.id)} />
              </Flex>
            </Card>
          ))}
        </Flex>
      ),
    },
    {
      key: 'attachments',
      label: <Flex align="center" gap={6}><PaperClipOutlined /><span>Files</span></Flex>,
      children: (
        <Flex vertical gap={12}>
          <Flex justify="flex-end">
            <Button icon={<PaperClipOutlined />} loading={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={uploadFile} />
          </Flex>
          {attachments.length === 0 && (
            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '24px 0' }}>
              No attachments.
            </Typography.Text>
          )}
          {attachments.map((a) => (
            <Card key={a.id}>
              <Flex align="center" gap={12}>
                <FileOutlined style={{ fontSize: 20, color: '#94a3b8', flexShrink: 0 }} />
                <Typography.Link style={{ flex: 1 }} ellipsis onClick={() => openAttachment(a.id)}>
                  {a.filename}
                </Typography.Link>
                <Typography.Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                  {formatBytes(a.sizeBytes)}
                </Typography.Text>
                <Button type="text" danger icon={<CloseOutlined />} onClick={() => deleteAttachment(a.id)} />
              </Flex>
            </Card>
          ))}
        </Flex>
      ),
    },
    {
      key: 'reminders',
      label: <Flex align="center" gap={6}><BellOutlined /><span>Alerts</span></Flex>,
      children: (
        <Flex vertical gap={12}>
          {reminders.length === 0 ? (
            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '24px 0' }}>
              No reminders. Add them from the Medications tab.
            </Typography.Text>
          ) : (
            reminders.map((r) => (
              <Card key={r.id}>
                <Flex align="center" gap={12}>
                  <BellOutlined style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text strong ellipsis>{r.medicationName}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.reminderTime}</Typography.Text>
                  </Flex>
                  <Switch size="small" checked={r.enabled} onChange={() => toggleReminder(r.id)} />
                  <Button type="text" danger icon={<CloseOutlined />} onClick={() => deleteReminder(r.id)} />
                </Flex>
              </Card>
            ))
          )}
        </Flex>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PageHeader
        title="Visit Detail"
        backHref="/"
        actions={
          <Flex gap={8}>
            <Button onClick={() => navigate(`/visits/${id}/edit`)}>Edit</Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleDeleteVisit}>Delete</Button>
          </Flex>
        }
      />
      <main style={{ width: '100%', maxWidth: 672, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {pageError && <Alert type="error" message={pageError} showIcon />}

        {visit && (
          <Card>
            <Flex vertical gap={8}>
              <Flex align="center" gap={8} wrap="wrap">
                <Typography.Text type="secondary" style={{ fontSize: 14 }}>{visit.visitDate}</Typography.Text>
                {visit.specialty && <Tag bordered={false}>{visit.specialty}</Tag>}
              </Flex>
              <Typography.Title level={4} style={{ margin: 0 }}>{visit.doctorName}</Typography.Title>
              {visit.clinic && (
                <Flex align="center" gap={6}>
                  <EnvironmentOutlined style={{ color: '#94a3b8' }} />
                  <Typography.Text type="secondary">{visit.clinic}</Typography.Text>
                </Flex>
              )}
              {(visit.chiefComplaint || visit.diagnosis) && <Divider style={{ margin: '8px 0' }} />}
              {visit.chiefComplaint && (
                <Typography.Text>
                  <Typography.Text type="secondary">Complaint: </Typography.Text>
                  {visit.chiefComplaint}
                </Typography.Text>
              )}
              {visit.diagnosis && (
                <Typography.Text>
                  <Typography.Text type="secondary">Diagnosis: </Typography.Text>
                  {visit.diagnosis}
                </Typography.Text>
              )}
              {visit.notes && (
                <Typography.Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                  {visit.notes}
                </Typography.Text>
              )}
            </Flex>
          </Card>
        )}

        <Tabs defaultActiveKey="medications" items={tabItems} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify the frontend builds cleanly**

```bash
cd /Users/vasudev.jamwal/bench/personal/team-hub/frontend && npm run build 2>&1 | tail -8
```

Expected: `✓ built in ...ms` with no errors.

- [ ] **Step 3: Verify backend tests still pass**

```bash
cd /Users/vasudev.jamwal/bench/personal/team-hub && mvn test -q 2>&1 | tail -3
```

Expected: `BUILD SUCCESS`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/VisitDetailPage.tsx
git commit -m "feat(antd): migrate VisitDetailPage — Tabs, Modal.confirm, Switch, message API"
```
