'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/projetos-legislativos', label: 'Projetos Legislativos', icon: 'P' },
  { href: '/biblioteca-legislativa', label: 'Biblioteca Legislativa', icon: 'B' }
] as const;

const adminNavItems = [{ href: '/gabinetes', label: 'Ativação de Gabinetes', icon: 'A' }] as const;

export function SidebarNav({ isPlatformAdmin }: { isPlatformAdmin: boolean }) {
  const pathname = usePathname();
  const visibleItems = isPlatformAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <nav className="sidebar-nav" aria-label="Navegação principal">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            className="sidebar-link"
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
