'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import { addEquipeMembro, type AddEquipeMembroState } from '@/app/(dashboard)/equipe-licenca/actions';

const initialState: AddEquipeMembroState = {};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? 'Enviando convite...' : 'Convidar membro'}
    </button>
  );
}

export function AddEquipeMembroForm({
  gabineteId,
  limiteUsuarios,
  membrosAtivos
}: {
  gabineteId: string;
  limiteUsuarios: number;
  membrosAtivos: number;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(addEquipeMembro, initialState);
  const limiteAtingido = membrosAtivos >= limiteUsuarios;

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form ref={formRef} action={action} className="team-add-form">
      <input type="hidden" name="gabinete_id" value={gabineteId} />
      <div>
        <p className="eyebrow">Adicionar membro</p>
        <h3>Convidar membro da equipe</h3>
        <p className="muted">
          O chefe da equipe pode convidar assessores, revisores e leitores dentro do limite contratado.
        </p>
      </div>

      <div className="form-row-3">
        <div>
          <label htmlFor={`member-name-${gabineteId}`}>Nome</label>
          <input
            id={`member-name-${gabineteId}`}
            className="input"
            name="nome"
            placeholder="Nome do membro"
            disabled={limiteAtingido}
            aria-invalid={Boolean(state.fieldErrors?.nome)}
            required
          />
          {state.fieldErrors?.nome ? <p className="field-error">{state.fieldErrors.nome[0]}</p> : null}
        </div>
        <div>
          <label htmlFor={`member-email-${gabineteId}`}>E-mail</label>
          <input
            id={`member-email-${gabineteId}`}
            className="input"
            type="email"
            name="email"
            placeholder="assessor@exemplo.com"
            disabled={limiteAtingido}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            required
          />
          {state.fieldErrors?.email ? <p className="field-error">{state.fieldErrors.email[0]}</p> : null}
        </div>
        <div>
          <label htmlFor={`member-role-${gabineteId}`}>Papel</label>
          <select
            id={`member-role-${gabineteId}`}
            className="select"
            name="papel_no_gabinete"
            defaultValue="assessor"
            disabled={limiteAtingido}
            aria-invalid={Boolean(state.fieldErrors?.papel_no_gabinete)}
          >
            <option value="assessor">Assessor jurídico</option>
            <option value="revisor">Revisor técnico</option>
            <option value="leitor">Leitor</option>
          </select>
          {state.fieldErrors?.papel_no_gabinete ? (
            <p className="field-error">{state.fieldErrors.papel_no_gabinete[0]}</p>
          ) : null}
        </div>
      </div>

      <div className="form-action-cell">
        <SubmitButton disabled={limiteAtingido} />
      </div>

      {limiteAtingido ? <p className="notice notice-warning">Limite de usuários ativos atingido para esta licença.</p> : null}
      {state.error ? <p className="notice notice-danger">{state.error}</p> : null}
      {state.success ? <p className="notice notice-success">{state.success}</p> : null}
    </form>
  );
}
