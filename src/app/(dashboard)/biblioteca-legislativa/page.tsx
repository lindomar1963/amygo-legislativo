import { NormaForm } from '@/components/biblioteca/norma-form';
import { NormasList } from '@/components/biblioteca/normas-list';
import { getBibliotecaNormas } from '@/lib/data/biblioteca';

export default async function BibliotecaLegislativaPage() {
  let normas: Awaited<ReturnType<typeof getBibliotecaNormas>> = [];
  let setupError: string | null = null;

  try {
    normas = await getBibliotecaNormas();
  } catch (error) {
    setupError = error instanceof Error ? error.message : 'Não foi possível carregar a biblioteca.';
  }

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Biblioteca normativa</p>
        <h1>Biblioteca Legislativa</h1>
        <p className="muted">
          Cadastre leis estaduais, municipais e federais para usar como base de pesquisa e análise comparativa.
        </p>
      </header>

      {setupError ? (
        <section className="card card-section">
          <h2>Banco de dados pendente</h2>
          <p className="muted">
            A tela já está pronta, mas a tabela da biblioteca precisa existir no Supabase antes de cadastrar normas.
          </p>
          <p className="notice notice-danger">{setupError}</p>
          <p className="muted">A migration está em supabase/migrations/202604260001_biblioteca_normas.sql.</p>
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
