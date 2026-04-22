import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Amygo Legislativo',
  description: 'Plataforma legislativa integrada ao Supabase'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
