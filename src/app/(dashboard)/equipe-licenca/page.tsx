import { EquipeLicencaPanel } from '@/components/equipe/equipe-licenca-panel';
import { getEquipeLicencaData } from '@/lib/data/equipe-licenca';

export default async function EquipeLicencaPage() {
  const data = await getEquipeLicencaData();

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Operação SaaS</p>
        <h1>Equipe e Licença</h1>
        <p className="muted">
          Controle os membros vinculados ao gabinete contratado, papéis de trabalho e limites comerciais do plano.
        </p>
      </header>

      {data.setupPendente ? (
        <section className="notice notice-warning">
          A tela está pronta, mas a tabela de licenças ainda precisa ser aplicada no Supabase. A migration está em
          supabase/migrations/202605020001_gabinete_licencas.sql.
        </section>
      ) : null}

      {data.gabinetes.length > 0 ? (
        <div className="grid">
          {data.gabinetes.map((gabinete) => (
            <EquipeLicencaPanel key={gabinete.gabinete.id} gabineteData={gabinete} />
          ))}
        </div>
      ) : (
        <section className="card card-section">
          <div>
            <p className="eyebrow">Ativação pendente</p>
            <h2>Nenhum gabinete vinculado</h2>
          </div>
          <p className="muted">
            A Amygo precisa ativar o gabinete contratado antes de liberar a gestão da equipe e os limites da licença.
          </p>
        </section>
      )}
    </main>
  );
}
