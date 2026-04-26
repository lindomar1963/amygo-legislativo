import type { Database } from '@/types/database';

type Norma = Pick<
  Database['public']['Tables']['biblioteca_normas']['Row'],
  'id' | 'titulo' | 'esfera' | 'uf' | 'municipio' | 'orgao_origem' | 'tipo' | 'numero' | 'ano' | 'tema' | 'ementa' | 'fonte_url'
>;

export function NormasList({ normas }: { normas: Norma[] }) {
  return (
    <section className="card">
      <h2>Normas cadastradas</h2>
      {normas.length === 0 ? <p className="muted">Nenhuma norma cadastrada na biblioteca.</p> : null}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {normas.map((norma) => (
          <li key={norma.id} style={{ borderTop: '1px solid var(--border)', padding: '0.85rem 0' }}>
            <strong>{norma.titulo}</strong>
            <p className="muted" style={{ margin: '0.25rem 0' }}>
              {norma.tipo} {norma.numero ? `n. ${norma.numero}` : ''} {norma.ano ? `/${norma.ano}` : ''} -{' '}
              {norma.esfera}
              {norma.uf ? `/${norma.uf}` : ''}
              {norma.municipio ? ` - ${norma.municipio}` : ''}
            </p>
            <p style={{ margin: '0.25rem 0' }}>{norma.ementa ?? 'Sem ementa cadastrada.'}</p>
            <p className="muted" style={{ margin: 0 }}>
              Origem: {norma.orgao_origem}
              {norma.tema ? ` | Tema: ${norma.tema}` : ''}
            </p>
            {norma.fonte_url ? (
              <a href={norma.fonte_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.5rem' }}>
                Fonte oficial
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
