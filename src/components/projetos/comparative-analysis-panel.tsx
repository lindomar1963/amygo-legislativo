'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  generateAnaliseComparativa,
  type GenerateAnaliseComparativaState
} from '@/app/(dashboard)/projetos-legislativos/[id]/actions';

const initialState: GenerateAnaliseComparativaState = {};

function GenerateButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? 'Gerando...' : 'Gerar analise comparativa'}
    </button>
  );
}

export function ComparativeAnalysisPanel({
  projetoId,
  hasReferencias
}: {
  projetoId: string;
  hasReferencias: boolean;
}) {
  const [state, action] = useActionState(generateAnaliseComparativa, initialState);

  return (
    <section className="card grid" style={{ gap: '1rem' }}>
      <div>
        <h2>Analise comparativa e minuta</h2>
        <p className="muted">
          Gere uma primeira versao de trabalho usando as normas marcadas como referencia na biblioteca.
        </p>
      </div>

      {!hasReferencias ? (
        <p className="muted">Marque pelo menos uma norma como referencia antes de gerar a analise.</p>
      ) : null}

      {state.error ? <p style={{ color: '#b91c1c' }}>{state.error}</p> : null}
      {state.success ? <p style={{ color: '#166534' }}>{state.success}</p> : null}

      <form action={action}>
        <input type="hidden" name="projeto_id" value={projetoId} />
        <GenerateButton disabled={!hasReferencias} />
      </form>
    </section>
  );
}
