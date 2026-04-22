'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { createGabinete, type CreateGabineteState } from '@/app/(dashboard)/gabinetes/actions';

const initialState: CreateGabineteState = {};

export function GabineteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, action, pending] = useActionState(createGabinete, initialState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form ref={formRef} action={action} className="card grid" style={{ gap: '0.75rem' }}>
      <h2>Novo gabinete</h2>

      <div>
        <input className="input" name="nome" placeholder="Nome do gabinete" required disabled={pending} />
        {state.fieldErrors?.nome ? <p style={{ color: '#b91c1c' }}>{state.fieldErrors.nome[0]}</p> : null}
      </div>

      <div>
        <select className="select" name="esfera" defaultValue="municipal" required disabled={pending}>
          <option value="municipal">Municipal</option>
          <option value="estadual">Estadual</option>
          <option value="federal">Federal</option>
        </select>
        {state.fieldErrors?.esfera ? <p style={{ color: '#b91c1c' }}>{state.fieldErrors.esfera[0]}</p> : null}
      </div>

      <div>
        <input
          className="input"
          name="orgao_casa_legislativa"
          placeholder="Órgão/Casa legislativa"
          required
          disabled={pending}
        />
        {state.fieldErrors?.orgao_casa_legislativa ? (
          <p style={{ color: '#b91c1c' }}>{state.fieldErrors.orgao_casa_legislativa[0]}</p>
        ) : null}
      </div>

      {state.error ? <p style={{ color: '#b91c1c' }}>{state.error}</p> : null}
      {state.success ? <p style={{ color: '#166534' }}>{state.success}</p> : null}

      <button className="button" type="submit" disabled={pending}>
        {pending ? 'Criando gabinete...' : 'Criar gabinete'}
      </button>
    </form>
  );
}
