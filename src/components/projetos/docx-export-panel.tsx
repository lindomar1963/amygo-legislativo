export function DocxExportPanel({
  projetoId,
  canExport
}: {
  projetoId: string;
  canExport: boolean;
}) {
  return (
    <section className="card card-section">
      <div>
        <p className="eyebrow">Protocolo</p>
        <h2>Exportação DOCX</h2>
        <p className="muted">Exporte a minuta e a justificativa em arquivo institucional editável.</p>
      </div>

      {!canExport ? (
        <p className="notice notice-warning">A exportação fica disponível depois da justificativa.</p>
      ) : null}

      {canExport ? (
        <a className="button" href={`/projetos-legislativos/${projetoId}/export-docx`}>
          Exportar DOCX
        </a>
      ) : (
        <button className="button" type="button" disabled>
          Exportar DOCX
        </button>
      )}
    </section>
  );
}
