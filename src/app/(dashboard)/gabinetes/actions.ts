'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { GABINETE_FIELD_NAMES } from '@/lib/gabinetes/form-fields';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/users/ensure-user-profile';
import type { Database } from '@/types/database';

type GabineteInsert = Database['public']['Tables']['gabinetes']['Insert'];
type GabineteLicencaInsert = Database['public']['Tables']['gabinete_licencas']['Insert'];

export type CreateGabineteState = {
  success?: string;
  error?: string;
  fieldErrors?: {
    nome?: string[];
    esfera?: string[];
    orgao_casa_legislativa?: string[];
  };
};

const gabineteSchema = z.object({
  [GABINETE_FIELD_NAMES.nome]: z.string().trim().min(1),
  [GABINETE_FIELD_NAMES.esfera]: z.enum(['municipal', 'estadual', 'federal']),
  [GABINETE_FIELD_NAMES.orgaoCasaLegislativa]: z.string().trim().min(1)
});

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === '42P01' ||
        error.message?.includes('gabinete_licencas') ||
        error.message?.includes('schema cache'))
  );
}

export async function createGabinete(
  _prevState: CreateGabineteState,
  formData: FormData
): Promise<CreateGabineteState> {
  const parsed = gabineteSchema.safeParse({
    nome: String(formData.get(GABINETE_FIELD_NAMES.nome) ?? ''),
    esfera: String(formData.get(GABINETE_FIELD_NAMES.esfera) ?? ''),
    orgao_casa_legislativa: String(formData.get(GABINETE_FIELD_NAMES.orgaoCasaLegislativa) ?? '')
  });

  if (!parsed.success) {
    return {
      error: 'Revise os campos do gabinete contratado.',
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Usuario nao autenticado.' };
  }

  const admin = createAdminClient();

  await ensureUserProfile(admin, user);

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('papel_global')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.papel_global !== 'admin_plataforma') {
    return { error: 'Somente administradores da Amygo podem ativar gabinetes contratados.' };
  }

  const gabineteInsert: GabineteInsert = {
    nome: parsed.data.nome,
    esfera: parsed.data.esfera,
    orgao_casa_legislativa: parsed.data.orgao_casa_legislativa,
    status: 'ativo'
  };

  const { data: gabinete, error: gabineteError } = await admin
    .from('gabinetes')
    .insert(gabineteInsert)
    .select('id')
    .single();

  if (gabineteError || !gabinete) {
    return { error: `Nao foi possivel ativar o gabinete: ${gabineteError?.message ?? 'registro nao retornado'}` };
  }

  const { error: membroError } = await admin.from('gabinetes_membros').insert({
    gabinete_id: gabinete.id,
    user_id: user.id,
    papel_no_gabinete: 'chefe',
    ativo: true
  });

  if (membroError) {
    await admin.from('gabinetes').delete().eq('id', gabinete.id);

    return { error: `Gabinete nao ativado: ${membroError.message}` };
  }

  const licencaInsert: GabineteLicencaInsert = {
    gabinete_id: gabinete.id,
    plano: 'essencial',
    limite_usuarios: 6,
    limite_projetos_mes: 30,
    status: 'ativo'
  };

  const { error: licencaError } = await admin.from('gabinete_licencas').insert(licencaInsert);

  if (licencaError && !isMissingTableError(licencaError)) {
    await admin.from('gabinetes').delete().eq('id', gabinete.id);

    return { error: `Gabinete nao ativado: ${licencaError.message}` };
  }

  revalidatePath('/gabinetes');
  revalidatePath('/dashboard');
  revalidatePath('/projetos-legislativos');
  revalidatePath('/equipe-licenca');

  return { success: 'Gabinete contratado ativado com sucesso.' };
}
