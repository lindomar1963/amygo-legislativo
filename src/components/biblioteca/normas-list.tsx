import type { Database } from '@/types/database';

type Norma = Pick<
  Database['public']['Tables']['biblioteca_normas']['Row'],
  'id' | 'titulo' | 'esfera' | 'uf' | 'municipio' | 'orgao_origem' | 'tipo' | 'numero' | 'ano' | 'tema' | 'ementa' | 'fonte_url'
>;

export function NormasList({ normas }: { normas: Norma[] }) {
  return (
    <section className="card card-section">
      <div>
        <p className="eyebrow">Base interna</p>
        <h2>Normas cadastradas</h2>
      </div>
      {normas.length === 0 ? <p className="muted">Nenhuma norma cadastrada na biblioteca.</p> : null}
      <ul className="list">
        {normas.map((norma) => (
          <li key={norma.id} className="list-card">
            <div>
              <strong>{norma.titulo}</strong>
              <p className="muted" style={{ margin: '0.45rem 0' }}>
                <span className="badge badge-minuta-generated">{norma.tipo}</span>{' '}
                <span className="badge badge-draft">
                  {norma.esfera}
                  {norma.uf ? `/${norma.uf}` : ''}
                </span>
              </p>
              <p style={{ margin: '0.25rem 0' }}>{norma.ementa ?? 'Sem ementa cadastrada.'}</p>
              <p className="muted" style={{ margin: 0 }}>
                {norma.numero ? `n. ${norma.numero}` : ''}
                {norma.ano ? `/${norma.ano}` : ''} {norma.municipio ? `- ${norma.municipio}` : ''}
              </p>
              <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                Origem: {norma.orgao_origem}
                {norma.tema ? ` | Tema: ${norma.tema}` : ''}
              </p>
            </div>
            {norma.fonte_url ? (
              <a className="section-link" href={norma.fonte_url} target="_blank" rel="noreferrer">
                Fonte oficial
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
