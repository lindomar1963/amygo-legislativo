'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/users/ensure-user-profile';
import type { Database } from '@/types/database';

type PapelNoGabinete = Database['public']['Tables']['gabinetes_membros']['Row']['papel_no_gabinete'];

export type AddEquipeMembroState = {
  success?: string;
  error?: string;
  fieldErrors?: {
    email?: string[];
    papel_no_gabinete?: string[];
  };
};

const addEquipeMembroSchema = z.object({
  gabinete_id: z.string().uuid(),
  email: z.string().trim().email('Informe um e-mail válido.'),
  papel_no_gabinete: z.enum(['assessor', 'revisor', 'leitor'])
});

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === '42P01' ||
        error.message?.includes('gabinete_licencas') ||
        error.message?.includes('schema cache'))
  );
}

export async function addEquipeMembro(
  _prevState: AddEquipeMembroState,
  formData: FormData
): Promise<AddEquipeMembroState> {
  const parsed = addEquipeMembroSchema.safeParse({
    gabinete_id: String(formData.get('gabinete_id') ?? ''),
    email: String(formData.get('email') ?? '').toLowerCase(),
    papel_no_gabinete: String(formData.get('papel_no_gabinete') ?? '')
  });

  if (!parsed.success) {
    return {
      error: 'Revise os dados do membro.',
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Sessão expirada. Entre novamente para gerenciar a equipe.' };
  }

  const admin = createAdminClient();
  await ensureUserProfile(admin, user);

  const { data: currentProfile, error: currentProfileError } = await admin
    .from('users')
    .select('papel_global')
    .eq('id', user.id)
    .single();

  if (currentProfileError) {
    return { error: `Não foi possível validar seu perfil: ${currentProfileError.message}` };
  }

  const { data: currentMembership, error: membershipError } = await admin
    .from('gabinetes_membros')
    .select('papel_no_gabinete, ativo')
    .eq('gabinete_id', parsed.data.gabinete_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: `Não foi possível validar seu vínculo ao gabinete: ${membershipError.message}` };
  }

  const isPlatformAdmin = currentProfile?.papel_global === 'admin_plataforma';
  const isChefe = currentMembership?.ativo && currentMembership.papel_no_gabinete === 'chefe';

  if (!isPlatformAdmin && !isChefe) {
    return { error: 'Somente o chefe da equipe ou a Amygo podem incluir membros neste gabinete.' };
  }

  const [{ count: membrosAtivos, error: countError }, licencaResult] = await Promise.all([
    admin
      .from('gabinetes_membros')
      .select('id', { count: 'exact', head: true })
      .eq('gabinete_id', parsed.data.gabinete_id)
      .eq('ativo', true),
    admin.from('gabinete_licencas').select('limite_usuarios, status').eq('gabinete_id', parsed.data.gabinete_id).maybeSingle()
  ]);

  if (countError) {
    return { error: `Não foi possível conferir o limite de usuários: ${countError.message}` };
  }

  let limiteUsuarios = 6;
  if (licencaResult.error && !isMissingTableError(licencaResult.error)) {
    return { error: `Não foi possível conferir a licença: ${licencaResult.error.message}` };
  }
  if (licencaResult.data) {
    limiteUsuarios = licencaResult.data.limite_usuarios;
    if (licencaResult.data.status !== 'ativo') {
      return { error: 'A licença deste gabinete não está ativa para inclusão de novos membros.' };
    }
  }

  if ((membrosAtivos ?? 0) >= limiteUsuarios) {
    return { error: `Limite de ${limiteUsuarios} usuários ativos atingido para este gabinete.` };
  }

  const { data: targetUser, error: targetUserError } = await admin
    .from('users')
    .select('id, email')
    .eq('email', parsed.data.email)
    .maybeSingle();

  if (targetUserError) {
    return { error: `Não foi possível localizar o usuário: ${targetUserError.message}` };
  }

  if (!targetUser) {
    return {
      error:
        'Usuário ainda não encontrado no Amygo. Nesta versão, ele precisa acessar/criar conta antes de ser vinculado ao gabinete.'
    };
  }

  const papel: PapelNoGabinete = parsed.data.papel_no_gabinete;
  const { error: upsertError } = await admin.from('gabinetes_membros').upsert(
    {
      gabinete_id: parsed.data.gabinete_id,
      user_id: targetUser.id,
      papel_no_gabinete: papel,
      ativo: true
    },
    { onConflict: 'gabinete_id,user_id' }
  );

  if (upsertError) {
    return { error: `Não foi possível vincular o membro: ${upsertError.message}` };
  }

  revalidatePath('/equipe-licenca');
  revalidatePath('/dashboard');

  return { success: 'Membro vinculado ao gabinete com sucesso.' };
}
