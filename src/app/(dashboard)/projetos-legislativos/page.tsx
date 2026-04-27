import { ProjetoForm } from '@/components/projetos/projeto-form';
import { ProjetosList } from '@/components/projetos/projetos-list';
import { getGabinetes } from '@/lib/data/gabinetes';
import { getProjetos } from '@/lib/data/projetos';

export default async function ProjetosLegislativosPage() {
  const [gabinetes, projetos] = await Promise.all([getGabinetes(), getProjetos()]);

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Pipeline legislativo</p>
        <h1>Projetos Legislativos</h1>
        <p className="muted">Listagem central de projetos por gabinete, tipo e status de tramitação interna.</p>
      </header>

      <ProjetoForm gabinetes={gabinetes} />
      <ProjetosList projetos={projetos} />
    </main>
  );
}
