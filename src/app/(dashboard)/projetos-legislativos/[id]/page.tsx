import { notFound } from 'next/navigation';

import { TechnicalComments } from '@/components/comentarios/technical-comments';
import { ComparativeAnalysisPanel } from '@/components/projetos/comparative-analysis-panel';
import { LegislativeResearchPanel } from '@/components/projetos/legislative-research-panel';
import { NormasBibliotecaPanel } from '@/components/projetos/normas-biblioteca-panel';
import { VersionHistory } from '@/components/versionamento/version-history';
import { getProjetoDetalhe } from '@/lib/data/projetos';

type Params = { params: Promise<{ id: string }> };

export default async function ProjetoDetalhePage({ params }: Params) {
  const { id } = await params;

  try {
    const { projeto, gabinete, normasRelacionadas, referencias, referenciasSetupError, versoes, comentarios } =
      await getProjetoDetalhe(id);

    return (
      <main className="grid" style={{ gap: '1rem' }}>
        <section className="card">
          <h1>{projeto.titulo}</h1>
          <p className="muted">
            {projeto.tipo} • {projeto.status_fluxo}
          </p>
          <p>{projeto.ementa ?? 'Sem ementa cadastrada.'}</p>
        </section>

        <LegislativeResearchPanel projeto={projeto} gabinete={gabinete} />
        <NormasBibliotecaPanel
          projetoId={projeto.id}
          normas={normasRelacionadas}
          referencias={referencias}
          setupError={referenciasSetupError}
        />
        <ComparativeAnalysisPanel projetoId={projeto.id} hasReferencias={referencias.length > 0} />
        <VersionHistory versoes={versoes} />
        <TechnicalComments comentarios={comentarios} />
      </main>
    );
  } catch {
    notFound();
  }
}
