import { NormaForm } from '@/components/biblioteca/norma-form';
import { NormasList } from '@/components/biblioteca/normas-list';
import { getBibliotecaNormas } from '@/lib/data/biblioteca';

export default async function BibliotecaLegislativaPage() {
  let normas: Awaited<ReturnType<typeof getBibliotecaNormas>> = [];
  let setupError: string | null = null;

  try {
    normas = await getBibliotecaNormas();
  } catch (error) {
    setupError = error instanceof Error ? error.message : 'Nao foi possivel carregar a biblioteca.';
  }

  return (
    <main className="grid" style={{ gap: '1rem' }}>
      <header>
        <h1>Biblioteca Legislativa</h1>
        <p className="muted">
          Cadastre leis estaduais, municipais e federais para usar como base de pesquisa e analise comparativa.
        </p>
      </header>

      {setupError ? (
        <section className="card">
          <h2>Banco de dados pendente</h2>
          <p className="muted">
            A tela ja esta pronta, mas a tabela da biblioteca precisa existir no Supabase antes de cadastrar normas.
          </p>
          <p style={{ color: '#b91c1c' }}>{setupError}</p>
          <p className="muted">
            A migration esta em supabase/migrations/202604260001_biblioteca_normas.sql.
          </p>
        </section>
      ) : (
        <>
          <NormaForm />
          <NormasList normas={normas} />
        </>
      )}
    </main>
  );
}
