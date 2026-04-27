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
      {pending ? 'Gerando...' : 'Gerar análise comparativa'}
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
    <section className="card card-section">
      <div>
        <p className="eyebrow">Análise legislativa</p>
        <h2>Análise comparativa e minuta</h2>
        <p className="muted">
          Gere uma versão preliminar usando as normas marcadas como referência na biblioteca.
        </p>
      </div>

      {!hasReferencias ? (
        <p className="muted">Marque pelo menos uma norma como referência antes de gerar a análise.</p>
      ) : null}

      {state.error ? <p className="notice notice-danger">{state.error}</p> : null}
      {state.success ? <p className="notice notice-success">{state.success}</p> : null}

      <form action={action}>
        <input type="hidden" name="projeto_id" value={projetoId} />
        <GenerateButton disabled={!hasReferencias} />
      </form>
    </section>
  );
}
