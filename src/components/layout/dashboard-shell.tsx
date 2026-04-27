import Link from 'next/link';
import type { ReactNode } from 'react';

import { signOut } from '@/app/(auth)/login/actions';

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'D' },
    { href: '/gabinetes', label: 'Gabinetes', icon: 'G' },
    { href: '/projetos-legislativos', label: 'Projetos Legislativos', icon: 'P' },
    { href: '/biblioteca-legislativa', label: 'Biblioteca Legislativa', icon: 'B' }
  ] as const;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AL</div>
          <div>
            <div className="brand-title">Amygo Legislativo</div>
            <div className="brand-subtitle">Inteligência institucional</div>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {navItems.map((item) => (
            <Link key={item.href} className="sidebar-link" href={item.href}>
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <form action={signOut} className="sidebar-footer">
          <button type="submit" className="button button-secondary" style={{ width: '100%' }}>
            Sair
          </button>
        </form>
      </aside>
      <section className="content-shell">{children}</section>
    </div>
  );
}
