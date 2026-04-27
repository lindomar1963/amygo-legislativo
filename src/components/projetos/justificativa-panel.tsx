'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  generateJustificativa,
  type GenerateJustificativaState
} from '@/app/(dashboard)/projetos-legislativos/[id]/actions';

const initialState: GenerateJustificativaState = {};

function GenerateJustificativaButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? 'Gerando...' : 'Gerar justificativa'}
    </button>
  );
}

export function JustificativaPanel({
  projetoId,
  approvedMinuta
}: {
  projetoId: string;
  approvedMinuta: boolean;
}) {
  const [state, action] = useActionState(generateJustificativa, initialState);

  return (
    <section className="card grid" style={{ gap: '1rem' }}>
      <div>
        <h2>Justificativa</h2>
        <p className="muted">
          Esta etapa so fica disponivel depois da aprovacao humana da minuta.
        </p>
      </div>

      {!approvedMinuta ? (
        <p style={{ color: '#92400e' }}>Minuta precisa ser aprovada antes de gerar justificativa.</p>
      ) : null}

      {state.error ? <p style={{ color: '#b91c1c' }}>{state.error}</p> : null}
      {state.success ? <p style={{ color: '#166534' }}>{state.success}</p> : null}

      <form action={action}>
        <input type="hidden" name="projeto_id" value={projetoId} />
        <GenerateJustificativaButton disabled={!approvedMinuta} />
      </form>
    </section>
  );
}
