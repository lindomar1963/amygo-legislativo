import { AddEquipeMembroForm } from '@/components/equipe/equipe-membro-form';
import type { GabineteEquipeLicenca } from '@/lib/data/equipe-licenca';

const papelLabels: Record<string, string> = {
  chefe: 'Chefe da equipe',
  assessor: 'Assessor jurídico',
  revisor: 'Revisor técnico',
  leitor: 'Leitor'
};

export function EquipeLicencaPanel({ gabineteData }: { gabineteData: GabineteEquipeLicenca }) {
  const membrosAtivos = gabineteData.membros.filter((membro) => membro.ativo).length;
  const usuariosPercentual = Math.min(100, Math.round((membrosAtivos / gabineteData.licenca.limite_usuarios) * 100));
  const projetosPercentual = Math.min(
    100,
    Math.round((gabineteData.projetosCriadosNoMes / gabineteData.licenca.limite_projetos_mes) * 100)
  );

  return (
    <section className="card card-section">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Gabinete contratado</p>
          <h2>{gabineteData.gabinete.nome}</h2>
          <p className="muted">
            {gabineteData.gabinete.orgao_casa_legislativa} · {gabineteData.gabinete.esfera}
          </p>
        </div>
        <span className="badge badge-minuta-approved">{gabineteData.licenca.status}</span>
      </div>

      <div className="license-grid">
        <article className="license-card">
          <span>Plano</span>
          <strong>{gabineteData.licenca.plano}</strong>
          {!gabineteData.licencaConfigurada ? <small>Limite padrão até configurar no Supabase</small> : null}
        </article>
        <article className="license-card">
          <span>Usuários</span>
          <strong>
            {membrosAtivos}/{gabineteData.licenca.limite_usuarios}
          </strong>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${usuariosPercentual}%` }} />
          </div>
        </article>
        <article className="license-card">
          <span>Projetos no mês</span>
          <strong>
            {gabineteData.projetosCriadosNoMes}/{gabineteData.licenca.limite_projetos_mes}
          </strong>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${projetosPercentual}%` }} />
          </div>
        </article>
      </div>

      <div>
        <p className="eyebrow">Membros vinculados</p>
        <table>
          <thead>
            <tr>
              <th align="left">Nome</th>
              <th align="left">E-mail</th>
              <th align="left">Papel</th>
              <th align="left">Status</th>
            </tr>
          </thead>
          <tbody>
            {gabineteData.membros.map((membro) => (
              <tr key={membro.id}>
                <td>{membro.usuario?.nome ?? 'Usuário sem perfil'}</td>
                <td>{membro.usuario?.email ?? membro.user_id}</td>
                <td>{papelLabels[membro.papel_no_gabinete] ?? membro.papel_no_gabinete}</td>
                <td>
                  <span className={membro.ativo ? 'badge badge-minuta-approved' : 'badge badge-draft'}>
                    {membro.ativo ? 'ativo' : 'inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gabineteData.podeGerenciarEquipe ? (
        <AddEquipeMembroForm
          gabineteId={gabineteData.gabinete.id}
          limiteUsuarios={gabineteData.licenca.limite_usuarios}
          membrosAtivos={membrosAtivos}
        />
      ) : (
        <p className="notice notice-warning">
          Somente o chefe da equipe pode solicitar inclusão de novos membros neste gabinete.
        </p>
      )}
    </section>
  );
}
