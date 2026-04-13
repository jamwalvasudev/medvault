import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/AuthContext';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar (md and above) ── */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-30 w-16 lg:w-48 bg-sidebar">
        {/* Logo */}
        <div className="flex items-center h-16 shrink-0 px-3 lg:px-5 border-b border-sidebar-accent">
          <span className="text-sidebar-foreground font-bold text-lg leading-none">M</span>
          <span className="hidden lg:inline text-sidebar-foreground font-bold text-base ml-0.5">
            edHistory
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors',
                isActive(href)
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline text-sm font-medium">{label}</span>
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-sidebar-accent shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {user?.picture ? (
              <img
                src={user.picture}
                alt=""
                className="h-8 w-8 rounded-full shrink-0 object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-sidebar-accent shrink-0" />
            )}
            <span className="hidden lg:block text-sidebar-muted text-xs truncate">
              {user?.name}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className="flex-1 flex flex-col md:ml-16 lg:ml-48 pb-16 md:pb-0 min-h-screen">
        {children}
      </div>

      {/* ── Bottom tab bar (mobile only) ── */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-sidebar-accent bg-sidebar">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            to={href}
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-2 transition-colors',
              isActive(href) ? 'text-primary' : 'text-sidebar-muted',
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
