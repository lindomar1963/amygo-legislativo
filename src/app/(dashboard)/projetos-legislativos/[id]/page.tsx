import { notFound } from 'next/navigation';

import { TechnicalComments } from '@/components/comentarios/technical-comments';
import { ComparativeAnalysisPanel } from '@/components/projetos/comparative-analysis-panel';
import { DocxExportPanel } from '@/components/projetos/docx-export-panel';
import { JustificativaPanel } from '@/components/projetos/justificativa-panel';
import { LegislativeResearchPanel } from '@/components/projetos/legislative-research-panel';
import { MinutaApprovalPanel } from '@/components/projetos/minuta-approval-panel';
import { NormasBibliotecaPanel } from '@/components/projetos/normas-biblioteca-panel';
import { VersionHistory } from '@/components/versionamento/version-history';
import { getProjetoDetalhe } from '@/lib/data/projetos';

type Params = { params: Promise<{ id: string }> };

const workflowLabels: Record<string, string> = {
  draft: 'Rascunho',
  analysis_generated: 'Análise gerada',
  minuta_generated: 'Minuta gerada',
  minuta_approved: 'Minuta validada',
  justificativa_generated: 'Justificativa elaborada',
  docx_exported: 'DOCX exportado'
};

const workflowSteps = [
  { status: 'draft', title: 'Rascunho', detail: 'Projeto cadastrado' },
  { status: 'minuta_generated', title: 'Minuta', detail: 'Texto-base elaborado' },
  { status: 'minuta_approved', title: 'Validação', detail: 'Revisão técnica concluída' },
  { status: 'justificativa_generated', title: 'Justificativa', detail: 'Justificativa elaborada' },
  { status: 'docx_exported', title: 'DOCX', detail: 'Pronto para protocolo' }
];

export default async function ProjetoDetalhePage({ params }: Params) {
  const { id } = await params;

  try {
    const { projeto, gabinete, normasRelacionadas, referencias, referenciasSetupError, versoes, comentarios } =
      await getProjetoDetalhe(id);

    const workflowStatus = projeto.workflow_status ?? 'draft';

    return (
      <main className="page">
        <section className="card card-elevated card-section">
          <div className="page-header">
            <p className="eyebrow">Dossiê legislativo</p>
            <h1>{projeto.titulo}</h1>
            <p className="muted">{projeto.ementa ?? 'Sem ementa cadastrada.'}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            <span className="badge badge-minuta-generated">{projeto.tipo}</span>
            <span className={`badge badge-${workflowStatus.replace(/_/g, '-')}`}>
              {workflowLabels[workflowStatus] ?? workflowStatus}
            </span>
            <span className={projeto.approved_minuta ? 'badge badge-minuta-approved' : 'badge badge-draft'}>
              {projeto.approved_minuta ? 'Minuta validada' : 'Validação pendente'}
            </span>
          </div>
          <div className="workflow" aria-label="Fluxo legislativo do projeto">
            {workflowSteps.map((step) => (
              <div
                key={step.status}
                className={`workflow-step${workflowStatus === step.status ? ' is-active' : ''}`}
              >
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </div>
            ))}
          </div>
        </section>

        <LegislativeResearchPanel projeto={projeto} gabinete={gabinete} />
        <NormasBibliotecaPanel
          projetoId={projeto.id}
          normas={normasRelacionadas}
          referencias={referencias}
          setupError={referenciasSetupError}
        />
        <ComparativeAnalysisPanel projetoId={projeto.id} hasReferencias={referencias.length > 0} />
        <MinutaApprovalPanel
          projetoId={projeto.id}
          approvedMinuta={projeto.approved_minuta}
          workflowStatus={projeto.workflow_status}
          hasVersoes={versoes.length > 0}
        />
        <JustificativaPanel projetoId={projeto.id} approvedMinuta={projeto.approved_minuta} />
        <DocxExportPanel
          projetoId={projeto.id}
          workflowStatus={projeto.workflow_status}
        />
        <VersionHistory versoes={versoes} />
        <TechnicalComments comentarios={comentarios} />
      </main>
    );
  } catch {
    notFound();
  }
}
