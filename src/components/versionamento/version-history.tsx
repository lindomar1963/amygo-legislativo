import type { Database } from '@/types/database';

type Versao = Pick<
  Database['public']['Tables']['projeto_versoes']['Row'],
  'id' | 'numero_versao' | 'resumo_alteracoes' | 'origem' | 'created_at'
>;

export function VersionHistory({ versoes }: { versoes: Versao[] }) {
  return (
    <section className="card">
      <h2>Historico de versoes</h2>
      {versoes.length === 0 ? (
        <p className="muted">Nenhuma versao gerada ainda. Use a analise comparativa para criar a primeira minuta.</p>
      ) : null}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {versoes.map((versao) => (
          <li key={versao.id} style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 0' }}>
            <strong>Versao {versao.numero_versao}</strong>
            <p className="muted" style={{ margin: '0.25rem 0' }}>
              Origem: {versao.origem} - {new Date(versao.created_at).toLocaleString('pt-BR')}
            </p>
            <p style={{ margin: 0 }}>{versao.resumo_alteracoes}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
