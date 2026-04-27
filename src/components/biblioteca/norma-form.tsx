'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import { createBibliotecaNorma, type CreateNormaState } from '@/app/(dashboard)/biblioteca-legislativa/actions';
import { BIBLIOTECA_ESFERAS, BIBLIOTECA_FIELD_NAMES, BIBLIOTECA_TIPOS } from '@/lib/biblioteca/form-fields';

const initialState: CreateNormaState = {};
const normaFormId = 'create-biblioteca-norma-form';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" form={normaFormId} disabled={pending}>
      {pending ? 'Cadastrando...' : 'Cadastrar norma'}
    </button>
  );
}

export function NormaForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, action] = useActionState(createBibliotecaNorma, initialState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form id={normaFormId} ref={formRef} action={action} className="card card-section">
      <div>
        <p className="eyebrow">Acervo normativo</p>
        <h2>Cadastrar norma</h2>
      </div>

      <input className="input" name={BIBLIOTECA_FIELD_NAMES.titulo} placeholder="Título da lei ou norma" required />

      <div className="form-row-2">
        <select className="select" name={BIBLIOTECA_FIELD_NAMES.esfera} defaultValue="estadual" required>
          {BIBLIOTECA_ESFERAS.map((esfera) => (
            <option key={esfera} value={esfera}>
              {esfera}
            </option>
          ))}
        </select>
        <select className="select" name={BIBLIOTECA_FIELD_NAMES.tipo} defaultValue="lei" required>
          {BIBLIOTECA_TIPOS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row-3">
        <input className="input" name={BIBLIOTECA_FIELD_NAMES.uf} placeholder="UF" maxLength={2} />
        <input className="input" name={BIBLIOTECA_FIELD_NAMES.numero} placeholder="Número" />
        <input className="input" name={BIBLIOTECA_FIELD_NAMES.ano} placeholder="Ano" inputMode="numeric" />
      </div>

      <input className="input" name={BIBLIOTECA_FIELD_NAMES.municipio} placeholder="Município, se houver" />
      <input className="input" name={BIBLIOTECA_FIELD_NAMES.orgaoOrigem} placeholder="Órgão de origem" required />
      <input className="input" name={BIBLIOTECA_FIELD_NAMES.tema} placeholder="Tema ou etiqueta principal" />

      <textarea className="textarea" name={BIBLIOTECA_FIELD_NAMES.ementa} placeholder="Ementa" rows={3} />
      <textarea
        className="textarea"
        name={BIBLIOTECA_FIELD_NAMES.textoIntegral}
        placeholder="Texto integral ou trecho relevante"
        rows={6}
      />

      <input className="input" name={BIBLIOTECA_FIELD_NAMES.fonteUrl} placeholder="Link da fonte oficial" />
      <input className="input" name={BIBLIOTECA_FIELD_NAMES.arquivoUrl} placeholder="Link do arquivo no Drive/nuvem" />

      <div aria-live="polite" role="status">
        {state.error ? <p className="notice notice-danger">{state.error}</p> : null}
        {state.success ? <p className="notice notice-success">{state.success}</p> : null}
      </div>

      <SubmitButton />
    </form>
  );
}
