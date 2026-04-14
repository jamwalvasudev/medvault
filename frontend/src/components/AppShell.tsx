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
