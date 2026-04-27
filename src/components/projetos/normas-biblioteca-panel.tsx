'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  addProjetoNormaReferencia,
  type AddProjetoReferenciaState
} from '@/app/(dashboard)/projetos-legislativos/[id]/actions';
import type { Database } from '@/types/database';

type Norma = Pick<
  Database['public']['Tables']['biblioteca_normas']['Row'],
  'id' | 'titulo' | 'esfera' | 'uf' | 'municipio' | 'orgao_origem' | 'tipo' | 'numero' | 'ano' | 'tema' | 'ementa' | 'fonte_url'
> & {
  score: number;
};

type Referencia = Pick<Database['public']['Tables']['projeto_normas_referencias']['Row'], 'norma_id'>;

const initialState: AddProjetoReferenciaState = {};

function ReferenceButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? 'Marcando...' : disabled ? 'Já usada como referência' : 'Usar como referência'}
    </button>
  );
}

export function NormasBibliotecaPanel({
  projetoId,
  normas,
  referencias,
  setupError
}: {
  projetoId: string;
  normas: Norma[];
  referencias: Referencia[];
  setupError?: string | null;
}) {
  const [state, action] = useActionState(addProjetoNormaReferencia, initialState);
  const referenciaIds = new Set(referencias.map((referencia) => referencia.norma_id));

  return (
    <section className="card card-section">
      <div>
        <p className="eyebrow">Matriz de adaptação</p>
        <h2>Normas da Biblioteca Relacionadas</h2>
        <p className="muted">
          Use sua biblioteca interna para escolher normas que servirão como matriz de comparação e adaptação.
        </p>
      </div>

      {setupError ? (
        <div className="notice notice-danger">
          <strong>Banco de dados pendente</strong>
          <p>{setupError}</p>
          <p className="muted">
            Aplique a migration supabase/migrations/202604260002_projeto_normas_referencias.sql no Supabase.
          </p>
        </div>
      ) : null}

      {state.error ? <p className="notice notice-danger">{state.error}</p> : null}
      {state.success ? <p className="notice notice-success">{state.success}</p> : null}

      {normas.length === 0 ? (
        <p className="muted">Nenhuma norma semelhante foi encontrada na sua biblioteca ainda.</p>
      ) : null}

      <div className="grid" style={{ gap: '0.75rem' }}>
        {normas.map((norma) => {
          const isReferenced = referenciaIds.has(norma.id);

          return (
            <article key={norma.id} className="list-card">
              <div>
                <strong>{norma.titulo}</strong>
                <p className="muted" style={{ margin: '0.25rem 0' }}>
                  <span className="badge badge-minuta-generated">{norma.tipo}</span>{' '}
                  <span className="badge badge-draft">
                    {norma.esfera}
                    {norma.uf ? `/${norma.uf}` : ''}
                  </span>{' '}
                  {norma.numero ? `n. ${norma.numero}` : ''} {norma.ano ? `/${norma.ano}` : ''}
                  {norma.municipio ? ` - ${norma.municipio}` : ''}
                </p>
                <p style={{ margin: 0 }}>{norma.ementa ?? 'Sem ementa cadastrada.'}</p>
                <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                  Origem: {norma.orgao_origem}
                  {norma.tema ? ` | Tema: ${norma.tema}` : ''} | Afinidade: {norma.score}
                </p>
              </div>

              <form action={action} className="grid" style={{ gap: '0.5rem' }}>
                <input type="hidden" name="projeto_id" value={projetoId} />
                <input type="hidden" name="norma_id" value={norma.id} />
                <ReferenceButton disabled={isReferenced || Boolean(setupError)} />
              </form>

              {norma.fonte_url ? (
                <a className="section-link" href={norma.fonte_url} target="_blank" rel="noreferrer">
                  Abrir fonte oficial
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
