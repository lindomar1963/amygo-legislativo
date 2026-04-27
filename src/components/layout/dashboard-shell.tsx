import type { ReactNode } from 'react';

import { signOut } from '@/app/(auth)/login/actions';
import { SidebarNav } from '@/components/layout/sidebar-nav';

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
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
        <SidebarNav />
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
