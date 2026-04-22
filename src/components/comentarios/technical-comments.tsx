import type { Database } from '@/types/database';

type Comentario = Pick<
  Database['public']['Tables']['comentarios_tecnicos']['Row'],
  'id' | 'tipo' | 'comentario' | 'resolvido' | 'created_at'
>;

export function TechnicalComments({ comentarios }: { comentarios: Comentario[] }) {
  return (
    <section className="card">
      <h2>Comentários técnicos</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {comentarios.map((comentario) => (
          <li key={comentario.id} style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 0' }}>
            <p style={{ margin: 0 }}>
              <strong>{comentario.tipo}</strong> · {comentario.resolvido ? 'Resolvido' : 'Aberto'}
            </p>
            <p style={{ margin: '0.35rem 0' }}>{comentario.comentario}</p>
            <p className="muted" style={{ margin: 0 }}>
              {new Date(comentario.created_at).toLocaleString('pt-BR')}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
