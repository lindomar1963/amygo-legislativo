import type { Database } from '@/types/database';

type Gabinete = Database['public']['Tables']['gabinetes']['Row'];

export function GabinetesTable({ gabinetes }: { gabinetes: Gabinete[] }) {
  return (
    <div className="card">
      <h2>Gabinetes cadastrados</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
            <tr key={gabinete.id} style={{ borderTop: '1px solid var(--border)' }}>
              <td>{gabinete.nome}</td>
              <td>{gabinete.esfera}</td>
              <td>{gabinete.orgao_casa_legislativa}</td>
              <td>{gabinete.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
