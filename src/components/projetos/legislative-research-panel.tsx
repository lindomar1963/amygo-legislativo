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
  const baseTerms = [projeto.titulo, projeto.ementa, gabinete.orgao_casa_legislativa]
    .filter(Boolean)
    .join(' ');
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
      description: 'Busca ampla em legislacao, proposicoes e acervo juridico brasileiro.',
      href: searchUrl(`${baseTerms} site:lexml.gov.br`)
    },
    {
      label: gabinete.esfera === 'municipal' ? 'Buscar em Camaras Municipais' : 'Buscar em Assembleias Legislativas',
      description: 'Prioriza casas legislativas do mesmo nivel do gabinete solicitante.',
      href: searchUrl(`${baseTerms} ${primaryTarget}`)
    },
    {
      label: 'Buscar na Camara dos Deputados',
      description: 'Verifica proposicoes federais semelhantes e justificativas de autores.',
      href: searchUrl(`${lawTerms} site:camara.leg.br`)
    },
    {
      label: 'Buscar no Senado Federal',
      description: 'Verifica proposicoes e normas correlatas no Senado.',
      href: searchUrl(`${lawTerms} site:senado.leg.br`)
    },
    {
      label: 'Buscar leis estaduais e municipais',
      description: 'Procura leis ja aprovadas que possam servir como matriz de adaptacao.',
      href: searchUrl(`${baseTerms} lei estadual lei municipal correlata`)
    }
  ];
}

export function LegislativeResearchPanel({ projeto, gabinete }: { projeto: Projeto; gabinete: Gabinete | null }) {
  if (!gabinete) {
    return (
      <section className="card">
        <h2>Pesquisa de leis correlatas</h2>
        <p className="muted">Vincule o projeto a um gabinete para orientar a pesquisa legislativa comparada.</p>
      </section>
    );
  }

  const links = buildResearchLinks(projeto, gabinete);

  return (
    <section className="card grid" style={{ gap: '1rem' }}>
      <div>
        <h2>Pesquisa de leis correlatas</h2>
        <p className="muted">
          Proximo passo: localizar normas e proposicoes semelhantes em outras casas legislativas antes de adaptar a
          minuta para {gabinete.orgao_casa_legislativa}.
        </p>
      </div>

      <div className="grid" style={{ gap: '0.75rem' }}>
        {links.map((link) => (
          <a
            key={link.label}
            className="card"
            href={link.href}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'block' }}
          >
            <strong>{link.label}</strong>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              {link.description}
            </p>
          </a>
        ))}
      </div>

      <div className="card" style={{ background: '#f8fafc' }}>
        <strong>Checklist de adaptacao</strong>
        <ul style={{ marginBottom: 0 }}>
          <li>Confirmar se a materia e de competencia estadual, municipal ou federal.</li>
          <li>Comparar ementa, justificativa, artigos principais e definicoes.</li>
          <li>Adaptar orgaos, prazos, fonte orcamentaria e realidade local.</li>
          <li>Registrar a fonte da lei correlata usada como referencia.</li>
        </ul>
      </div>
    </section>
  );
}
