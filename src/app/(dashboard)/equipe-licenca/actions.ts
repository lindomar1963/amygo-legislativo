'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/users/ensure-user-profile';
import type { Database } from '@/types/database';

type PapelNoGabinete = Database['public']['Tables']['gabinetes_membros']['Row']['papel_no_gabinete'];

export type AddEquipeMembroState = {
  success?: string;
  error?: string;
  inviteLink?: string;
  fieldErrors?: {
    nome?: string[];
    email?: string[];
    papel_no_gabinete?: string[];
  };
};

const addEquipeMembroSchema = z.object({
  gabinete_id: z.string().uuid(),
  nome: z.string().trim().min(2, 'Informe o nome do membro.'),
  email: z.string().trim().email('Informe um e-mail valido.'),
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
    nome: String(formData.get('nome') ?? ''),
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
    return { error: 'Sessao expirada. Entre novamente para gerenciar a equipe.' };
  }

  const admin = createAdminClient();
  await ensureUserProfile(admin, user);

  const { data: currentProfile, error: currentProfileError } = await admin
    .from('users')
    .select('papel_global')
    .eq('id', user.id)
    .single();

  if (currentProfileError) {
    return { error: `Nao foi possivel validar seu perfil: ${currentProfileError.message}` };
  }

  const { data: currentMembership, error: membershipError } = await admin
    .from('gabinetes_membros')
    .select('papel_no_gabinete, ativo')
    .eq('gabinete_id', parsed.data.gabinete_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: `Nao foi possivel validar seu vinculo ao gabinete: ${membershipError.message}` };
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
    return { error: `Nao foi possivel conferir o limite de usuarios: ${countError.message}` };
  }

  let limiteUsuarios = 6;
  if (licencaResult.error && !isMissingTableError(licencaResult.error)) {
    return { error: `Nao foi possivel conferir a licenca: ${licencaResult.error.message}` };
  }
  if (licencaResult.data) {
    limiteUsuarios = licencaResult.data.limite_usuarios;
    if (licencaResult.data.status !== 'ativo') {
      return { error: 'A licenca deste gabinete nao esta ativa para inclusao de novos membros.' };
    }
  }

  if ((membrosAtivos ?? 0) >= limiteUsuarios) {
    return { error: `Limite de ${limiteUsuarios} usuarios ativos atingido para este gabinete.` };
  }

  const { data: targetUser, error: targetUserError } = await admin
    .from('users')
    .select('id, email, nome')
    .eq('email', parsed.data.email)
    .maybeSingle();

  if (targetUserError) {
    return { error: `Nao foi possivel localizar o usuario: ${targetUserError.message}` };
  }

  let targetUserId = targetUser?.id;
  let inviteLink: string | undefined;

  if (!targetUserId) {
    const redirectTo = `${env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login`;
    const { data: inviteData, error: inviteError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: parsed.data.email,
      options: {
        redirectTo,
        data: {
          nome: parsed.data.nome
        }
      }
    });

    if (inviteError || !inviteData.user || !inviteData.properties?.action_link) {
      return {
        error: `Nao foi possivel gerar convite ao membro: ${inviteError?.message ?? 'link nao retornado'}`
      };
    }

    targetUserId = inviteData.user.id;
    inviteLink = inviteData.properties.action_link;

    const { error: profileError } = await admin.from('users').upsert(
      {
        id: inviteData.user.id,
        email: inviteData.user.email ?? parsed.data.email,
        nome: parsed.data.nome,
        papel_global: 'usuario'
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      return { error: `Convite gerado, mas o perfil do membro nao foi criado: ${profileError.message}` };
    }
  }

  const papel: PapelNoGabinete = parsed.data.papel_no_gabinete;
  const { error: upsertError } = await admin.from('gabinetes_membros').upsert(
    {
      gabinete_id: parsed.data.gabinete_id,
      user_id: targetUserId,
      papel_no_gabinete: papel,
      ativo: true
    },
    { onConflict: 'gabinete_id,user_id' }
  );

  if (upsertError) {
    return { error: `Nao foi possivel vincular o membro: ${upsertError.message}` };
  }

  revalidatePath('/equipe-licenca');
  revalidatePath('/dashboard');

  return {
    success: inviteLink
      ? 'Convite gerado e membro vinculado ao gabinete. Copie o link abaixo e envie ao membro.'
      : 'Membro vinculado ao gabinete com sucesso.',
    inviteLink
  };
}
