import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main>
      <div className="card" style={{ maxWidth: 480, margin: '4rem auto' }}>
        <h1>Entrar na plataforma</h1>
        <p className="muted">Use sua conta do gabinete para acessar os módulos legislativos.</p>
        <LoginForm />
      </div>
    </main>
  );
}
