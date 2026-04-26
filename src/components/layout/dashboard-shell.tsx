import Link from 'next/link';
import type { ReactNode } from 'react';

import { signOut } from '@/app/(auth)/login/actions';

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
      <aside style={{ borderRight: '1px solid var(--border)', padding: '1rem', background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Amygo Legislativo</h2>
        <nav className="grid" style={{ gap: '0.5rem' }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/gabinetes">Gabinetes</Link>
          <Link href="/projetos-legislativos">Projetos Legislativos</Link>
          <Link href="/biblioteca-legislativa">Biblioteca Legislativa</Link>
        </nav>
        <form action={signOut} style={{ marginTop: '2rem' }}>
          <button type="submit" className="button" style={{ width: '100%' }}>
            Sair
          </button>
        </form>
      </aside>
      <section>{children}</section>
    </div>
  );
}
