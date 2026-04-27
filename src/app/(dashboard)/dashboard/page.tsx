import { getDashboardSummary } from '@/lib/data/dashboard';

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Painel institucional</p>
        <h1>Dashboard</h1>
        <p className="muted">Visão geral operacional dos módulos legislativos.</p>
      </header>

      <section className="stats-grid">
        <article className="card stat-card">
          <h3>Gabinetes</h3>
          <p className="stat-value">{summary.totalGabinetes}</p>
          <p className="muted">Estruturas políticas vinculadas</p>
        </article>
        <article className="card stat-card">
          <h3>Projetos</h3>
          <p className="stat-value">{summary.totalProjetos}</p>
          <p className="muted">Proposições em acompanhamento</p>
        </article>
        <article className="card stat-card">
          <h3>Comentários em aberto</h3>
          <p className="stat-value">{summary.comentariosAbertos}</p>
          <p className="muted">Pendências técnicas registradas</p>
        </article>
      </section>
    </main>
  );
}
