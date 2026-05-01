import { getDashboardSummary } from '@/lib/data/dashboard';

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Painel institucional</p>
        <h1>Dashboard</h1>
        <p className="muted">Visão geral da operação legislativa do gabinete contratado.</p>
      </header>

      <section className="stats-grid">
        <article className="card stat-card stat-gabinetes">
          <div className="stat-icon" aria-hidden="true">
            G
          </div>
          <h3>Gabinetes ativos</h3>
          <p className="stat-value">{summary.totalGabinetes}</p>
          <p className="muted">Ambientes institucionais vinculados</p>
        </article>
        <article className="card stat-card stat-projetos">
          <div className="stat-icon" aria-hidden="true">
            P
          </div>
          <h3>Projetos</h3>
          <p className="stat-value">{summary.totalProjetos}</p>
          <p className="muted">Proposições em acompanhamento</p>
        </article>
        <article className="card stat-card stat-comentarios">
          <div className="stat-icon" aria-hidden="true">
            C
          </div>
          <h3>Comentários em aberto</h3>
          <p className="stat-value">{summary.comentariosAbertos}</p>
          <p className="muted">Pendências técnicas registradas</p>
        </article>
      </section>
    </main>
  );
}
