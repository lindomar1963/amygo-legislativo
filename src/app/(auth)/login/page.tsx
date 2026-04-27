import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="login-shell">
      <div className="login-panel">
        <section className="login-hero">
          <div className="brand-mark">AL</div>
          <p className="eyebrow" style={{ color: '#d6a84f' }}>
            Govtech legislativa
          </p>
          <h1>Amygo Legislativo</h1>
          <p style={{ maxWidth: 520, color: 'rgba(255,255,255,0.78)' }}>
            Plataforma institucional para pesquisa normativa, elaboração legislativa, validação técnica e gestão do
            fluxo de projetos.
          </p>
        </section>
        <section className="login-form-card">
          <div>
            <p className="eyebrow">Acesso restrito</p>
            <h2>Entrar na plataforma</h2>
            <p className="muted">Use sua conta do gabinete para acessar os módulos legislativos.</p>
          </div>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
