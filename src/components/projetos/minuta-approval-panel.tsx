'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { approveMinuta, type ApproveMinutaState } from '@/app/(dashboard)/projetos-legislativos/[id]/actions';

const initialState: ApproveMinutaState = {};

function ApproveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? 'Aprovando...' : 'Aprovar minuta'}
    </button>
  );
}

export function MinutaApprovalPanel({
  projetoId,
  approvedMinuta,
  workflowStatus,
  hasVersoes
}: {
  projetoId: string;
  approvedMinuta: boolean;
  workflowStatus: string;
  hasVersoes: boolean;
}) {
  const [state, action] = useActionState(approveMinuta, initialState);
  const canApprove = hasVersoes && !approvedMinuta;

  return (
    <section className="card grid" style={{ gap: '1rem' }}>
      <div>
        <h2>Aprovacao humana da minuta</h2>
        <p className="muted">
          A justificativa so deve ser gerada depois que a minuta for revisada e aprovada pelo usuario.
        </p>
      </div>

      <p style={{ color: approvedMinuta ? '#166534' : '#92400e' }}>
        {approvedMinuta
          ? 'Minuta aprovada. A proxima etapa e gerar a justificativa.'
          : hasVersoes
            ? 'Minuta pendente de aprovacao.'
            : 'Gere uma minuta antes de aprovar.'}
      </p>

      <p className="muted" style={{ margin: 0 }}>
        Status do fluxo: {workflowStatus}
      </p>

      {state.error ? <p style={{ color: '#b91c1c' }}>{state.error}</p> : null}
      {state.success ? <p style={{ color: '#166534' }}>{state.success}</p> : null}

      <form action={action}>
        <input type="hidden" name="projeto_id" value={projetoId} />
        <ApproveButton disabled={!canApprove} />
      </form>
    </section>
  );
}
