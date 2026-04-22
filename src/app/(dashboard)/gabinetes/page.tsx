import { GabineteForm } from '@/components/gabinetes/gabinete-form';
import { GabinetesTable } from '@/components/gabinetes/gabinetes-table';
import { getGabinetes } from '@/lib/data/gabinetes';

export default async function GabinetesPage() {
  const gabinetes = await getGabinetes();

  return (
    <main className="grid" style={{ gap: '1rem' }}>
      <div>
        <h1>Gestão de Gabinetes</h1>
        <p className="muted">Cadastro, visualização e manutenção dos gabinetes vinculados ao usuário.</p>
      </div>
      <GabineteForm />
      <GabinetesTable gabinetes={gabinetes} />
    </main>
  );
}
