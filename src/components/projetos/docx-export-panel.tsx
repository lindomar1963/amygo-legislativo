export function DocxExportPanel({
  projetoId,
  canExport
}: {
  projetoId: string;
  canExport: boolean;
}) {
  return (
    <section className="card grid" style={{ gap: '1rem' }}>
      <div>
        <h2>Exportacao DOCX</h2>
        <p className="muted">Exporte a minuta e a justificativa em arquivo institucional editavel.</p>
      </div>

      {!canExport ? (
        <p style={{ color: '#92400e' }}>A exportacao fica disponivel depois da justificativa.</p>
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
