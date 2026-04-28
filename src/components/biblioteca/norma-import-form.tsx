'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import { importBibliotecaNorma, type ImportNormaState } from '@/app/(dashboard)/biblioteca-legislativa/actions';
import { BIBLIOTECA_ESFERAS, BIBLIOTECA_FIELD_NAMES, BIBLIOTECA_TIPOS } from '@/lib/biblioteca/form-fields';

const importFormId = 'import-biblioteca-norma-form';
const initialState: ImportNormaState = {};

const importModes = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'texto', label: 'Texto' },
  { value: 'link', label: 'Link oficial' }
] as const;

type ImportMode = (typeof importModes)[number]['value'];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" form={importFormId} disabled={pending}>
      {pending ? 'Importando...' : 'Importar norma'}
    </button>
  );
}

export function NormaImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [mode, setMode] = useState<ImportMode>('pdf');
  const [state, action] = useActionState(importBibliotecaNorma, initialState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setMode('pdf');
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <section className="card card-section">
      <div>
        <p className="eyebrow">Importação</p>
        <h2>Importar norma</h2>
        <p className="muted">
          Importe PDF com texto selecionável, DOCX, texto colado ou link oficial. OCR ainda não está disponível.
        </p>
      </div>

      <form id={importFormId} ref={formRef} action={action} className="grid">
        <div className="form-row-2">
          {importModes.map((option) => (
            <label key={option.value} className="notice" style={{ cursor: 'pointer' }}>
              <input
                type="radio"
                name="import_mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
              />{' '}
              {option.label}
            </label>
          ))}
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

        {mode === 'pdf' || mode === 'docx' ? (
          <div className="notice">
            <label htmlFor="arquivo_norma">Arquivo da norma até 10MB</label>
            <input
              id="arquivo_norma"
              className="input"
              name="arquivo_norma"
              type="file"
              accept={
                mode === 'pdf'
                  ? 'application/pdf,.pdf'
                  : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx'
              }
              required
            />
          </div>
        ) : null}

        {mode === 'texto' ? (
          <textarea className="textarea" name="texto_colado" placeholder="Cole aqui o texto integral da norma" rows={8} required />
        ) : null}

        {mode === 'link' ? (
          <input className="input" name="link_oficial" placeholder="URL oficial da norma" type="url" required />
        ) : null}

        <input className="input" name={BIBLIOTECA_FIELD_NAMES.fonteUrl} placeholder="Link da fonte oficial, se houver" type="url" />

        <div aria-live="polite" role="status">
          {state.error ? <p className="notice notice-danger">{state.error}</p> : null}
          {state.success ? <p className="notice notice-success">{state.success}</p> : null}
        </div>

        <SubmitButton />
      </form>
    </section>
  );
}
