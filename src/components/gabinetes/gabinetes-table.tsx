import type { Database } from '@/types/database';

type Gabinete = Database['public']['Tables']['gabinetes']['Row'];

export function GabinetesTable({ gabinetes }: { gabinetes: Gabinete[] }) {
  return (
    <div className="card card-section">
      <div>
        <p className="eyebrow">Estruturas cadastradas</p>
        <h2>Gabinetes cadastrados</h2>
      </div>
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
    </div>
  );
}
