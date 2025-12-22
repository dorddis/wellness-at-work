'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Eye,
  LayoutDashboard,
  Users,
  Bell,
  Settings,
  Menu,
  X,
  BarChart3,
  Building2,
  Loader2,
  Activity,
  Timer,
  Trophy,
  Plug,
  TrendingUp,
} from 'lucide-react';
import { AuthProvider, useAuth } from '../providers';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  adminOnly?: boolean;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Personal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { href: '/dashboard/my-wellness', label: 'My Wellness', icon: <Activity className="w-5 h-5" /> },
      { href: '/dashboard/exercises', label: 'Eye Exercises', icon: <Eye className="w-5 h-5" /> },
      { href: '/dashboard/breaks', label: 'Break Timer', icon: <Timer className="w-5 h-5" /> },
      { href: '/dashboard/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Team',
    adminOnly: true,
    items: [
      { href: '/admin', label: 'Team Overview', icon: <BarChart3 className="w-5 h-5" />, adminOnly: true },
      { href: '/admin/employees', label: 'Employees', icon: <Users className="w-5 h-5" />, adminOnly: true },
      { href: '/admin/challenges', label: 'Team Challenges', icon: <Trophy className="w-5 h-5" />, adminOnly: true },
      { href: '/admin/analytics', label: 'Analytics', icon: <TrendingUp className="w-5 h-5" />, adminOnly: true },
    ],
  },
  {
    title: 'System',
    adminOnly: true,
    items: [
      { href: '/admin/alerts', label: 'Alerts', icon: <Bell className="w-5 h-5" />, adminOnly: true },
      { href: '/admin/integrations', label: 'Integrations', icon: <Plug className="w-5 h-5" />, adminOnly: true },
      { href: '/admin/settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, adminOnly: true },
    ],
  },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // No user or no org - AuthProvider will redirect, show loading in meantime
  if (!user || !user.organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user.organization.role === 'admin' || user.organization.role === 'manager';

  // Filter sections based on admin status
  const filteredSections = navSections
    .filter((section) => !section.adminOnly || isAdmin)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdmin),
    }));

  // Improved isActive check - exact match for base routes, prefix match for sub-routes
  const checkIsActive = (href: string): boolean => {
    // Exact match for dashboard home
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    // Exact match for admin home (Team Overview)
    if (href === '/admin' && pathname === '/admin') return true;
    // For other routes, check if pathname matches exactly or is a direct child
    if (href !== '/dashboard' && href !== '/admin') {
      return pathname === href || pathname.startsWith(href + '/');
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transform transition-transform lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/icon.png" alt="Lumina" width={24} height={24} className="w-6 h-6" />
            <span className="text-lg font-bold">Lumina</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Org info */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium truncate">{user.organization?.name}</span>
          </div>
        </div>

        {/* Navigation - flex-1 takes remaining space, overflow-y-auto for scrolling */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto min-h-0 overscroll-contain">
          {filteredSections.map((section, sectionIndex) => (
            <div key={section.title}>
              {/* Section header */}
              <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </h3>
              {/* Section items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = checkIsActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <span className={isActive ? 'opacity-100' : 'opacity-70'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section - shrink-0 stays at bottom */}
        <div className="shrink-0 p-4 border-t border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user.organization?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-background/95 backdrop-blur border-b border-border lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <Link
              href="/admin/alerts"
              className="relative text-muted-foreground hover:text-foreground transition-colors"
              title="View alerts"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

// Wrap with AuthProvider
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}
