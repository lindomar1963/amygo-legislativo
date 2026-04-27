import type { Database } from '@/types/database';

type Projeto = Pick<Database['public']['Tables']['projetos_legislativos']['Row'], 'titulo' | 'ementa' | 'tipo'>;
type Gabinete = Pick<
  Database['public']['Tables']['gabinetes']['Row'],
  'nome' | 'esfera' | 'orgao_casa_legislativa'
>;

type ResearchLink = {
  label: string;
  description: string;
  href: string;
};

function searchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function buildResearchLinks(projeto: Projeto, gabinete: Gabinete): ResearchLink[] {
  const baseTerms = [projeto.titulo, projeto.ementa, gabinete.orgao_casa_legislativa].filter(Boolean).join(' ');
  const lawTerms = `"${projeto.titulo}" lei projeto legislativo ${gabinete.esfera}`;

  const primaryTarget =
    gabinete.esfera === 'municipal'
      ? 'camara municipal lei correlata'
      : gabinete.esfera === 'estadual'
        ? 'assembleia legislativa lei estadual correlata'
        : 'camara deputados senado legislacao federal correlata';

  return [
    {
      label: 'Pesquisar no LexML',
      description: 'Busca ampla em legislação, proposições e acervo jurídico brasileiro.',
      href: searchUrl(`${baseTerms} site:lexml.gov.br`)
    },
    {
      label: gabinete.esfera === 'municipal' ? 'Buscar em Câmaras Municipais' : 'Buscar em Assembleias Legislativas',
      description: 'Prioriza casas legislativas do mesmo nível do gabinete solicitante.',
      href: searchUrl(`${baseTerms} ${primaryTarget}`)
    },
    {
      label: 'Buscar na Câmara dos Deputados',
      description: 'Verifica proposições federais semelhantes e justificativas de autores.',
      href: searchUrl(`${lawTerms} site:camara.leg.br`)
    },
    {
      label: 'Buscar no Senado Federal',
      description: 'Verifica proposições e normas correlatas no Senado.',
      href: searchUrl(`${lawTerms} site:senado.leg.br`)
    },
    {
      label: 'Buscar leis estaduais e municipais',
      description: 'Procura leis já aprovadas que possam servir como matriz de adaptação.',
      href: searchUrl(`${baseTerms} lei estadual lei municipal correlata`)
    }
  ];
}

export function LegislativeResearchPanel({ projeto, gabinete }: { projeto: Projeto; gabinete: Gabinete | null }) {
  if (!gabinete) {
    return (
      <section className="card card-section">
        <h2>Pesquisa de leis correlatas</h2>
        <p className="muted">Vincule o projeto a um gabinete para orientar a pesquisa legislativa comparada.</p>
      </section>
    );
  }

  const links = buildResearchLinks(projeto, gabinete);

  return (
    <section className="card card-section">
      <div>
        <p className="eyebrow">Pesquisa comparada</p>
        <h2>Pesquisa de leis correlatas</h2>
        <p className="muted">
          Próximo passo: localizar normas e proposições semelhantes em outras casas legislativas antes de adaptar a
          minuta para {gabinete.orgao_casa_legislativa}.
        </p>
      </div>

      <div className="grid" style={{ gap: '0.75rem' }}>
        {links.map((link) => (
          <a key={link.label} className="list-card" href={link.href} target="_blank" rel="noreferrer">
            <strong>{link.label}</strong>
            <p className="muted" style={{ margin: 0 }}>
              {link.description}
            </p>
          </a>
        ))}
      </div>

      <div className="notice">
        <strong>Checklist de adaptação</strong>
        <ul style={{ marginBottom: 0 }}>
          <li>Confirmar se a matéria é de competência estadual, municipal ou federal.</li>
          <li>Comparar ementa, justificativa, artigos principais e definições.</li>
          <li>Adaptar órgãos, prazos, fonte orçamentária e realidade local.</li>
          <li>Registrar a fonte da lei correlata usada como referência.</li>
        </ul>
      </div>
    </section>
  );
}
