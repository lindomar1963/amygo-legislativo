'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { approveMinuta, type ApproveMinutaState } from '@/app/(dashboard)/projetos-legislativos/[id]/actions';

const initialState: ApproveMinutaState = {};

function ApproveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? 'Validando...' : 'Validar minuta'}
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
    <section className="card card-section">
      <div>
        <p className="eyebrow">Validação técnica</p>
        <h2>Validação da minuta</h2>
        <p className="muted">A justificativa fica disponível após a validação técnica da minuta-base.</p>
      </div>

      <p className={approvedMinuta ? 'notice notice-success' : 'notice notice-warning'}>
        {approvedMinuta
          ? 'Minuta validada. A justificativa pode ser elaborada na próxima etapa.'
          : hasVersoes
            ? 'Minuta pendente de validação.'
            : 'Gere uma minuta antes de validar.'}
      </p>

      <p className="muted" style={{ margin: 0 }}>
        Status do fluxo: <span className={`badge badge-${workflowStatus.replace(/_/g, '-')}`}>{workflowStatus}</span>
      </p>

      {state.error ? <p className="notice notice-danger">{state.error}</p> : null}
      {state.success ? <p className="notice notice-success">{state.success}</p> : null}

      <form action={action}>
        <input type="hidden" name="projeto_id" value={projetoId} />
        <ApproveButton disabled={!canApprove} />
      </form>
    </section>
  );
}
