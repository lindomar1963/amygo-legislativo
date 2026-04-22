export function GabineteForm() {
  return (
    <form className="card grid" style={{ gap: '0.75rem' }}>
      <h2>Novo gabinete</h2>
      <input className="input" name="nome" placeholder="Nome do gabinete" />
      <select className="select" name="esfera" defaultValue="municipal">
        <option value="municipal">Municipal</option>
        <option value="estadual">Estadual</option>
        <option value="federal">Federal</option>
      </select>
      <input className="input" name="orgao_casa_legislativa" placeholder="Órgão/Casa legislativa" />
      <button className="button" type="button">
        Criar gabinete (conectar ação)
      </button>
    </form>
  );
}
