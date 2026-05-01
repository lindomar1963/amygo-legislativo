import { createClient } from '@/lib/supabase/server';

export async function getCurrentUserContext() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      isPlatformAdmin: false
    };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, nome, email, papel_global')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    profile,
    isPlatformAdmin: profile?.papel_global === 'admin_plataforma'
  };
}
