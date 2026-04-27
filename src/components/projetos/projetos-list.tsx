import Link from 'next/link';

import type { Database } from '@/types/database';

type Projeto = Pick<
  Database['public']['Tables']['projetos_legislativos']['Row'],
  'id' | 'titulo' | 'ementa' | 'status_fluxo' | 'tipo' | 'created_at'
>;

export function ProjetosList({ projetos }: { projetos: Projeto[] }) {
  return (
    <div className="card card-section">
      <div>
        <p className="eyebrow">Carteira legislativa</p>
        <h2>Projetos Legislativos</h2>
      </div>
      {projetos.length === 0 ? <p className="muted">Nenhum projeto legislativo cadastrado.</p> : null}
      <ul className="list">
        {projetos.map((projeto) => (
          <li key={projeto.id} className="list-card">
            <div>
              <Link className="section-link" href={`/projetos-legislativos/${projeto.id}`}>
                <strong>{projeto.titulo}</strong>
              </Link>
              <p className="muted" style={{ margin: '0.35rem 0' }}>
                <span className="badge badge-minuta-generated">{projeto.tipo}</span>{' '}
                <span className="badge badge-draft">{projeto.status_fluxo}</span>
              </p>
              <p style={{ margin: 0 }}>{projeto.ementa ?? 'Sem ementa.'}</p>
            </div>
            <Link className="button button-secondary" href={`/projetos-legislativos/${projeto.id}`}>
              Abrir projeto
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
