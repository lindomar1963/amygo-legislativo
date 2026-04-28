export function DocxExportPanel({
  projetoId,
  workflowStatus
}: {
  projetoId: string;
  workflowStatus: string;
}) {
  const canExport = workflowStatus === 'justificativa_generated';
  const canReexport = workflowStatus === 'docx_exported';
  const isAvailable = canExport || canReexport;

  return (
    <section className="card card-section">
      <div>
        <p className="eyebrow">Protocolo</p>
        <h2>Exportação DOCX</h2>
        <p className="muted">Exporte a minuta e a justificativa em arquivo institucional editável.</p>
      </div>

      {!isAvailable ? (
        <p className="notice notice-warning">A exportação fica disponível depois da justificativa.</p>
      ) : null}

      {canExport ? (
        <a className="button" href={`/projetos-legislativos/${projetoId}/export-docx`}>
          Exportar DOCX
        </a>
      ) : null}

      {canReexport ? (
        <div className="grid" style={{ gap: '0.75rem' }}>
          <a className="button" href={`/projetos-legislativos/${projetoId}/export-docx?mode=download`}>
            Baixar novamente DOCX
          </a>
          <a className="button button-secondary" href={`/projetos-legislativos/${projetoId}/export-docx?mode=new`}>
            Gerar nova versão DOCX
          </a>
        </div>
      ) : null}

      {!isAvailable ? (
        <button className="button" type="button" disabled>
          Exportar DOCX
        </button>
      ) : null}
    </section>
  );
}
