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
      {pending ? 'Elaborando...' : 'Elaborar justificativa'}
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
    <section className="card card-section">
      <div>
        <p className="eyebrow">Fundamentação</p>
        <h2>Justificativa</h2>
        <p className="muted">Esta etapa ficará disponível após a validação técnica da minuta.</p>
      </div>

      {!approvedMinuta ? (
        <p className="notice notice-warning">Minuta precisa ser validada antes da elaboração da justificativa.</p>
      ) : null}

      {state.error ? <p className="notice notice-danger">{state.error}</p> : null}
      {state.success ? <p className="notice notice-success">{state.success}</p> : null}

      <form action={action}>
        <input type="hidden" name="projeto_id" value={projetoId} />
        <GenerateJustificativaButton disabled={!approvedMinuta} />
      </form>
    </section>
  );
}
