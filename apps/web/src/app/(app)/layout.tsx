'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { AuthGate, useAuth } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  show: boolean;
}

function Shell({ children }: { children: ReactNode }) {
  const { user, can, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const main: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', show: can('read', 'Dashboard') },
    { href: '/tickets', label: user.role === 'Client' ? 'My tickets' : 'Tickets', show: can('read', 'Ticket') },
    { href: '/tickets/new', label: 'Raise a ticket', show: can('create', 'Ticket') },
  ];
  const admin: NavItem[] = [
    { href: '/admin/sites', label: 'Sites', show: can('manage', 'Site') },
    { href: '/admin/users', label: 'Users', show: can('read', 'User') },
    { href: '/admin/roles', label: 'Roles & permissions', show: can('read', 'Role') },
  ];

  const isActive = (href: string) => (href === '/tickets' ? pathname === '/tickets' || /^\/tickets\/(?!new)/.test(pathname) : pathname === href);

  const link = (n: NavItem) =>
    n.show && (
      <Link
        key={n.href}
        href={n.href}
        onClick={() => setOpen(false)}
        className={`block rounded-md px-3 py-2 text-sm font-medium ${isActive(n.href) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        {n.label}
      </Link>
    );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="font-semibold text-slate-900">SiteVoice</span>
        <button onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" className="rounded border border-slate-300 px-2.5 py-1 text-sm">
          {open ? 'Close' : 'Menu'}
        </button>
      </header>

      <aside className={`${open ? 'block' : 'hidden'} w-full shrink-0 border-r border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col md:self-start md:overflow-y-auto`}>
        <div className="hidden items-center gap-2 px-5 py-5 md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">S</div>
          <span className="text-lg font-semibold text-slate-900">SiteVoice</span>
        </div>
        <nav className="space-y-1 px-3 py-2">
          {main.map(link)}
          {admin.some((n) => n.show) && <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Administration</p>}
          {admin.map(link)}
        </nav>
        <div className="mt-auto border-t border-slate-200 p-4">
          <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.role}</p>
          <button onClick={logout} className="mt-3 text-sm font-medium text-blue-600 hover:underline">
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}
