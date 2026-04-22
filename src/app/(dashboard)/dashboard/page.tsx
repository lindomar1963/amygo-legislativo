import { getDashboardSummary } from '@/lib/data/dashboard';

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <main>
      <h1>Dashboard</h1>
      <p className="muted">Visão geral operacional dos módulos legislativos.</p>

      <section className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: '1rem' }}>
        <article className="card">
          <h3>Gabinetes</h3>
          <p style={{ fontSize: '2rem', marginBottom: 0 }}>{summary.totalGabinetes}</p>
        </article>
        <article className="card">
          <h3>Projetos</h3>
          <p style={{ fontSize: '2rem', marginBottom: 0 }}>{summary.totalProjetos}</p>
        </article>
        <article className="card">
          <h3>Comentários em aberto</h3>
          <p style={{ fontSize: '2rem', marginBottom: 0 }}>{summary.comentariosAbertos}</p>
        </article>
      </section>
    </main>
  );
}
