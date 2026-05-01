import { GabineteForm } from '@/components/gabinetes/gabinete-form';
import { GabinetesTable } from '@/components/gabinetes/gabinetes-table';
import { getCurrentUserContext } from '@/lib/data/current-user';
import { getGabinetes } from '@/lib/data/gabinetes';

export default async function GabinetesPage() {
  const [{ isPlatformAdmin }, gabinetes] = await Promise.all([getCurrentUserContext(), getGabinetes()]);

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Ativação comercial</p>
        <h1>Gabinetes contratados</h1>
        <p className="muted">
          O gabinete e a estrutura institucional são configurados pela Amygo antes da equipe do parlamentar
          iniciar a operação legislativa.
        </p>
      </header>

      {isPlatformAdmin ? (
        <GabineteForm />
      ) : (
        <section className="card card-section">
          <div>
            <p className="eyebrow">Ambiente operacional</p>
            <h2>Gabinete já ativado pela Amygo</h2>
          </div>
          <p className="muted">
            A equipe do parlamentar não precisa criar gabinete. Após a contratação, a Amygo entrega o ambiente
            institucional pronto e o chefe da equipe gerencia apenas os projetos, a biblioteca normativa e as
            entregas documentais.
          </p>
        </section>
      )}

      <GabinetesTable gabinetes={gabinetes} isPlatformAdmin={isPlatformAdmin} />
    </main>
  );
}
