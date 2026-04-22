import { ProjetosList } from '@/components/projetos/projetos-list';
import { getProjetos } from '@/lib/data/projetos';

export default async function ProjetosLegislativosPage() {
  const projetos = await getProjetos();

  return (
    <main className="grid" style={{ gap: '1rem' }}>
      <header>
        <h1>Projetos Legislativos</h1>
        <p className="muted">Listagem central de projetos por gabinete, tipo e status de tramitação interna.</p>
      </header>

      <ProjetosList projetos={projetos} />
    </main>
  );
}
