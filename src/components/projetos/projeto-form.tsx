'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { createProjeto, type CreateProjetoState } from '@/app/(dashboard)/projetos-legislativos/actions';
import { PROJETO_FIELD_NAMES, PROJETO_TIPOS } from '@/lib/projetos/form-fields';
import type { Database } from '@/types/database';

type Gabinete = Pick<Database['public']['Tables']['gabinetes']['Row'], 'id' | 'nome' | 'esfera'>;

const initialState: CreateProjetoState = {};
const projetoFormId = 'create-projeto-form';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" form={projetoFormId} disabled={disabled || pending}>
      {pending ? 'Criando projeto...' : 'Criar projeto'}
    </button>
  );
}

export function ProjetoForm({ gabinetes }: { gabinetes: Gabinete[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, action] = useActionState(createProjeto, initialState);
  const hasGabinetes = gabinetes.length > 0;

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form id={projetoFormId} ref={formRef} action={action} className="card grid" style={{ gap: '1rem' }}>
      <h2>Novo projeto legislativo</h2>

      <div>
        <select
          className="select"
          name={PROJETO_FIELD_NAMES.gabineteId}
          required
          disabled={!hasGabinetes}
          aria-invalid={Boolean(state.fieldErrors?.gabinete_id)}
          defaultValue=""
        >
          <option value="" disabled>
            Selecione o gabinete
          </option>
          {gabinetes.map((gabinete) => (
            <option key={gabinete.id} value={gabinete.id}>
              {gabinete.nome} ({gabinete.esfera})
            </option>
          ))}
        </select>
        {state.fieldErrors?.gabinete_id ? <p style={{ color: '#b91c1c' }}>{state.fieldErrors.gabinete_id[0]}</p> : null}
      </div>

      <div>
        <input
          className="input"
          name={PROJETO_FIELD_NAMES.titulo}
          placeholder="Titulo do projeto"
          required
          aria-invalid={Boolean(state.fieldErrors?.titulo)}
        />
        {state.fieldErrors?.titulo ? <p style={{ color: '#b91c1c' }}>{state.fieldErrors.titulo[0]}</p> : null}
      </div>

      <div>
        <select
          className="select"
          name={PROJETO_FIELD_NAMES.tipo}
          defaultValue="PL"
          required
          aria-invalid={Boolean(state.fieldErrors?.tipo)}
        >
          {PROJETO_TIPOS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
        {state.fieldErrors?.tipo ? <p style={{ color: '#b91c1c' }}>{state.fieldErrors.tipo[0]}</p> : null}
      </div>

      <div>
        <textarea
          className="textarea"
          name={PROJETO_FIELD_NAMES.ementa}
          placeholder="Ementa ou resumo"
          rows={4}
          aria-invalid={Boolean(state.fieldErrors?.ementa)}
        />
        {state.fieldErrors?.ementa ? <p style={{ color: '#b91c1c' }}>{state.fieldErrors.ementa[0]}</p> : null}
      </div>

      {!hasGabinetes ? <p className="muted">Cadastre um gabinete antes de criar projetos legislativos.</p> : null}

      <div aria-live="polite" role="status">
        {state.error ? <p style={{ color: '#b91c1c' }}>{state.error}</p> : null}
        {state.success ? (
          <div className="card" style={{ borderColor: '#86efac', background: '#f0fdf4' }}>
            <p style={{ color: '#166534', marginTop: 0 }}>{state.success}</p>
            <p className="muted">Proximo passo: abra o projeto para trabalhar na minuta, versoes e revisoes.</p>
            {state.projetoId ? (
              <Link className="button" href={`/projetos-legislativos/${state.projetoId}`}>
                Abrir projeto
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <SubmitButton disabled={!hasGabinetes} />
    </form>
  );
}
