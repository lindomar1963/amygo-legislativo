import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <div className="card" style={{ maxWidth: 700, margin: '2rem auto' }}>
        <h1>Amygo Legislativo</h1>
        <p className="muted">
          Estrutura inicial pronta com autenticação Supabase, dashboard e módulos legislativos.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <Link className="button" href="/login">
            Entrar
          </Link>
          <Link className="button" href="/dashboard">
            Ir para Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
