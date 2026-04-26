'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type GabineteInsert = Database['public']['Tables']['gabinetes']['Insert'];

export const GABINETE_FIELD_NAMES = {
  nome: 'nome',
  esfera: 'esfera',
  orgaoCasaLegislativa: 'orgao_casa_legislativa'
} as const;

const gabineteSchema = z.object({
  [GABINETE_FIELD_NAMES.nome]: z.string().trim().min(1, 'Nome e obrigatorio.'),
  [GABINETE_FIELD_NAMES.esfera]: z.enum(['municipal', 'estadual', 'federal'], {
    errorMap: () => ({ message: 'Esfera invalida.' })
  }),
  [GABINETE_FIELD_NAMES.orgaoCasaLegislativa]: z
    .string()
    .trim()
    .min(1, 'Orgao/Casa legislativa e obrigatorio.')
});

export type CreateGabineteState = {
  success?: string;
  error?: string;
  fieldErrors?: {
    nome?: string[];
    esfera?: string[];
    orgao_casa_legislativa?: string[];
  };
};

export async function createGabinete(
  _prevState: CreateGabineteState | null,
  formData: FormData
): Promise<CreateGabineteState> {
  const parsed = gabineteSchema.safeParse({
    [GABINETE_FIELD_NAMES.nome]: String(formData.get(GABINETE_FIELD_NAMES.nome) ?? ''),
    [GABINETE_FIELD_NAMES.esfera]: String(formData.get(GABINETE_FIELD_NAMES.esfera) ?? ''),
    [GABINETE_FIELD_NAMES.orgaoCasaLegislativa]: String(formData.get(GABINETE_FIELD_NAMES.orgaoCasaLegislativa) ?? '')
  });

  if (!parsed.success) {
    return {
      error: 'Revise os campos obrigatorios.',
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessao expirada. Entre novamente para criar o gabinete.' };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Nao foi possivel preparar a criacao do gabinete.'
    };
  }

  const gabineteToInsert: GabineteInsert = {
    nome: parsed.data.nome,
    esfera: parsed.data.esfera,
    orgao_casa_legislativa: parsed.data.orgao_casa_legislativa,
    status: 'ativo'
  };

  const { data: gabinete, error: gabineteError } = await supabase
    .from('gabinetes')
    .insert(gabineteToInsert)
    .select('id')
    .single();

  if (gabineteError || !gabinete) {
    return {
      error: gabineteError?.message ?? 'Nao foi possivel criar o gabinete.'
    };
  }

  const { error: membroError } = await admin.from('gabinetes_membros').insert({
    gabinete_id: gabinete.id,
    user_id: user.id,
    papel_no_gabinete: 'chefe',
    ativo: true
  });

  if (membroError) {
    await admin.from('gabinetes').delete().eq('id', gabinete.id);

    return {
      error: `Gabinete nao criado: ${membroError.message}`
    };
  }

  revalidatePath('/gabinetes');

  return { success: 'Gabinete criado com sucesso.' };
}
