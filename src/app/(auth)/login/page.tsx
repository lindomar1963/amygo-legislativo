import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="login-shell">
      <div className="login-panel">
        <section className="login-hero">
          <div className="brand-mark">AL</div>
          <p className="eyebrow" style={{ color: '#c9a646' }}>
            Govtech legislativa
          </p>
          <h1>Legislação inteligente para decisões institucionais seguras</h1>
          <p style={{ maxWidth: 520, color: 'rgba(255,255,255,0.78)' }}>
            Minutas, justificativas e análises legislativas com velocidade e controle técnico.
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
