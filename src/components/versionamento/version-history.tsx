import type { Database } from '@/types/database';

type Versao = Pick<
  Database['public']['Tables']['projeto_versoes']['Row'],
  'id' | 'numero_versao' | 'resumo_alteracoes' | 'origem' | 'created_at'
>;

export function VersionHistory({ versoes }: { versoes: Versao[] }) {
  return (
    <section className="card card-section">
      <div>
        <p className="eyebrow">Controle documental</p>
        <h2>Histórico de versões</h2>
      </div>
      {versoes.length === 0 ? (
        <p className="muted">Nenhuma versão registrada ainda. Use a análise comparativa para criar a minuta-base.</p>
      ) : null}
      <ul className="list">
        {versoes.map((versao) => (
          <li key={versao.id} className="list-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <strong>Versão {versao.numero_versao}</strong>
              <span className="badge badge-draft">{versao.origem}</span>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Registro: {new Date(versao.created_at).toLocaleString('pt-BR')}
            </p>
            <p style={{ margin: 0 }}>{versao.resumo_alteracoes}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
