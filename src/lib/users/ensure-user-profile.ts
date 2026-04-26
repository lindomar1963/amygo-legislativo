import 'server-only';

import type { SupabaseClient, User } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

type UserInsert = Database['public']['Tables']['users']['Insert'];

export async function ensureUserProfile(admin: SupabaseClient<Database>, user: User) {
  const userProfile: UserInsert = {
    id: user.id,
    email: user.email ?? `${user.id}@amygo.local`,
    nome:
      typeof user.user_metadata?.nome === 'string'
        ? user.user_metadata.nome
        : typeof user.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : user.email ?? 'Usuario Amygo'
  };

  const { error } = await admin.from('users').upsert(userProfile, {
    onConflict: 'id'
  });

  if (error) {
    throw new Error(`Nao foi possivel preparar o usuario: ${error.message}`);
  }
}
