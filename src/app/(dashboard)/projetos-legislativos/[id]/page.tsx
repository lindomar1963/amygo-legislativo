import { notFound } from 'next/navigation';

import { TechnicalComments } from '@/components/comentarios/technical-comments';
import { VersionHistory } from '@/components/versionamento/version-history';
import { getProjetoDetalhe } from '@/lib/data/projetos';

type Params = { params: Promise<{ id: string }> };

export default async function ProjetoDetalhePage({ params }: Params) {
  const { id } = await params;

  try {
    const { projeto, versoes, comentarios } = await getProjetoDetalhe(id);

    return (
      <main className="grid" style={{ gap: '1rem' }}>
        <section className="card">
          <h1>{projeto.titulo}</h1>
          <p className="muted">
            {projeto.tipo} • {projeto.status_fluxo}
          </p>
          <p>{projeto.ementa ?? 'Sem ementa cadastrada.'}</p>
        </section>

        <VersionHistory versoes={versoes} />
        <TechnicalComments comentarios={comentarios} />
      </main>
    );
  } catch {
    notFound();
  }
}
