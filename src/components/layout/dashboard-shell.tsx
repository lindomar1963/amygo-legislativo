import type { ReactNode } from 'react';

import { signOut } from '@/app/(auth)/login/actions';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { getCurrentUserContext } from '@/lib/data/current-user';

type DashboardShellProps = {
  children: ReactNode;
};

export async function DashboardShell({ children }: DashboardShellProps) {
  const { isPlatformAdmin, profile } = await getCurrentUserContext();

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
        <SidebarNav isPlatformAdmin={isPlatformAdmin} />
        <div className="sidebar-context" aria-label="Perfil de acesso">
          <span>{isPlatformAdmin ? 'Admin Amygo' : 'Ambiente do gabinete'}</span>
          {profile?.nome ? <strong>{profile.nome}</strong> : null}
        </div>
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
