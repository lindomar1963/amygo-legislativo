import type { Database } from '@/types/database';

type Gabinete = Database['public']['Tables']['gabinetes']['Row'];

export function GabinetesTable({
  gabinetes,
  isPlatformAdmin = false
}: {
  gabinetes: Gabinete[];
  isPlatformAdmin?: boolean;
}) {
  return (
    <div className="card card-section">
      <div>
        <p className="eyebrow">{isPlatformAdmin ? 'Clientes ativados' : 'Seu ambiente'}</p>
        <h2>{isPlatformAdmin ? 'Gabinetes cadastrados' : 'Gabinete disponível para operação'}</h2>
      </div>

      {gabinetes.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th align="left">Nome</th>
              <th align="left">Esfera</th>
              <th align="left">Órgão/Casa</th>
              <th align="left">Status</th>
            </tr>
          </thead>
          <tbody>
            {gabinetes.map((gabinete) => (
              <tr key={gabinete.id}>
                <td>{gabinete.nome}</td>
                <td>
                  <span className="badge badge-minuta-generated">{gabinete.esfera}</span>
                </td>
                <td>{gabinete.orgao_casa_legislativa}</td>
                <td>
                  <span className="badge badge-minuta-approved">{gabinete.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="notice notice-warning">
          Nenhum gabinete foi vinculado a este acesso. A Amygo precisa concluir a ativação comercial antes da
          equipe iniciar novos projetos legislativos.
        </p>
      )}
    </div>
  );
}
