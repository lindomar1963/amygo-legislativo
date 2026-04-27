import { GabineteForm } from '@/components/gabinetes/gabinete-form';
import { GabinetesTable } from '@/components/gabinetes/gabinetes-table';
import { getGabinetes } from '@/lib/data/gabinetes';

export default async function GabinetesPage() {
  const gabinetes = await getGabinetes();

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Gestão institucional</p>
        <h1>Gestão de Gabinetes</h1>
        <p className="muted">Cadastro, visualização e manutenção dos gabinetes vinculados ao usuário.</p>
      </header>
      <GabineteForm />
      <GabinetesTable gabinetes={gabinetes} />
    </main>
  );
}
