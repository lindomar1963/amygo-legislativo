'use client';

import { useActionState } from 'react';

import { signInWithEmail } from '@/app/(auth)/login/actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(signInWithEmail, null as { error?: string } | null);

  return (
    <form action={action} className="grid" style={{ gap: '0.9rem' }}>
      <div>
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="input" required />
      </div>

      <div>
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" className="input" required />
      </div>

      {state?.error ? <p className="notice notice-danger">{state.error}</p> : null}

      <button type="submit" className="button" disabled={pending}>
        {pending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
