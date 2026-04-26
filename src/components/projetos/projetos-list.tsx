import Link from 'next/link';

import type { Database } from '@/types/database';

type Projeto = Pick<
  Database['public']['Tables']['projetos_legislativos']['Row'],
  'id' | 'titulo' | 'ementa' | 'status_fluxo' | 'tipo' | 'created_at'
>;

export function ProjetosList({ projetos }: { projetos: Projeto[] }) {
  return (
    <div className="card">
      <h2>Projetos Legislativos</h2>
      {projetos.length === 0 ? <p className="muted">Nenhum projeto legislativo cadastrado.</p> : null}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {projetos.map((projeto) => (
          <li key={projeto.id} style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 0' }}>
            <Link href={`/projetos-legislativos/${projeto.id}`}>
              <strong>{projeto.titulo}</strong>
            </Link>
            <p className="muted" style={{ margin: '0.25rem 0' }}>
              {projeto.tipo} • {projeto.status_fluxo}
            </p>
            <p style={{ margin: 0 }}>{projeto.ementa ?? 'Sem ementa.'}</p>
            <Link className="button" href={`/projetos-legislativos/${projeto.id}`} style={{ marginTop: '0.75rem', display: 'inline-block' }}>
              Abrir projeto
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
