'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import {
  createGabinete,
  GABINETE_FIELD_NAMES,
  type CreateGabineteState,
} from '@/app/(dashboard)/gabinetes/actions';

const initialState: CreateGabineteState = {};
const gabineteFormId = 'create-gabinete-form';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" form={gabineteFormId} disabled={pending}>
      {pending ? 'Criando gabinete...' : 'Criar gabinete'}
    </button>
  );
}

export function GabineteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, action] = useActionState(createGabinete, initialState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form id={gabineteFormId} ref={formRef} action={action} className="card grid" style={{ gap: '0.75rem' }}>
      <h2>Novo gabinete</h2>

      <div>
        <input
          className="input"
          name={GABINETE_FIELD_NAMES.nome}
          placeholder="Nome do gabinete"
          required
          aria-invalid={Boolean(state.fieldErrors?.nome)}
        />
        {state.fieldErrors?.nome ? <p style={{ color: '#b91c1c' }}>{state.fieldErrors.nome[0]}</p> : null}
      </div>

      <div>
        <select
          className="select"
          name={GABINETE_FIELD_NAMES.esfera}
          defaultValue="municipal"
          required
          aria-invalid={Boolean(state.fieldErrors?.esfera)}
        >
          <option value="municipal">Municipal</option>
          <option value="estadual">Estadual</option>
          <option value="federal">Federal</option>
        </select>
        {state.fieldErrors?.esfera ? <p style={{ color: '#b91c1c' }}>{state.fieldErrors.esfera[0]}</p> : null}
      </div>

      <div>
        <input
          className="input"
          name={GABINETE_FIELD_NAMES.orgaoCasaLegislativa}
          placeholder="Órgão/Casa legislativa"
          required
          aria-invalid={Boolean(state.fieldErrors?.orgao_casa_legislativa)}
        />
        {state.fieldErrors?.orgao_casa_legislativa ? (
          <p style={{ color: '#b91c1c' }}>{state.fieldErrors.orgao_casa_legislativa[0]}</p>
        ) : null}
      </div>

      <div aria-live="polite" role="status">
        {state.error ? <p style={{ color: '#b91c1c' }}>{state.error}</p> : null}
        {state.success ? <p style={{ color: '#166534' }}>{state.success}</p> : null}
      </div>

      <SubmitButton />
    </form>
  );
}
