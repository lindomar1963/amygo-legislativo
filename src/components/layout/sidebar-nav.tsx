'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/gabinetes', label: 'Gabinetes', icon: 'G' },
  { href: '/projetos-legislativos', label: 'Projetos Legislativos', icon: 'P' },
  { href: '/biblioteca-legislativa', label: 'Biblioteca Legislativa', icon: 'B' }
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" aria-label="Navegação principal">
      {navItems.map((item) => {
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
