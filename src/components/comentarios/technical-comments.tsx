import type { Database } from '@/types/database';

type Comentario = Pick<
  Database['public']['Tables']['comentarios_tecnicos']['Row'],
  'id' | 'tipo' | 'comentario' | 'resolvido' | 'created_at'
>;

export function TechnicalComments({ comentarios }: { comentarios: Comentario[] }) {
  return (
    <section className="card card-section">
      <div>
        <p className="eyebrow">Revisão especializada</p>
        <h2>Comentários técnicos</h2>
      </div>
      {comentarios.length === 0 ? <p className="muted">Nenhum comentário técnico registrado.</p> : null}
      <ul className="list">
        {comentarios.map((comentario) => (
          <li key={comentario.id} className="list-card">
            <p style={{ margin: 0 }}>
              <strong>{comentario.tipo}</strong>{' '}
              <span className={comentario.resolvido ? 'badge badge-minuta-approved' : 'badge badge-draft'}>
                {comentario.resolvido ? 'Resolvido' : 'Aberto'}
              </span>
            </p>
            <p style={{ margin: 0 }}>{comentario.comentario}</p>
            <p className="muted" style={{ margin: 0 }}>
              {new Date(comentario.created_at).toLocaleString('pt-BR')}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
