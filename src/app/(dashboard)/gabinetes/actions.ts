'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

export const GABINETE_FIELD_NAMES = {
  nome: 'nome',
  esfera: 'esfera',
  orgaoCasaLegislativa: 'orgao_casa_legislativa',
} as const;

const gabineteSchema = z.object({
  [GABINETE_FIELD_NAMES.nome]: z.string().trim().min(1, 'Nome é obrigatório.'),
  [GABINETE_FIELD_NAMES.esfera]: z.enum(['municipal', 'estadual', 'federal'], {
    errorMap: () => ({ message: 'Esfera inválida.' }),
  }),
  [GABINETE_FIELD_NAMES.orgaoCasaLegislativa]: z.string().trim().min(1, 'Órgão/Casa legislativa é obrigatório.'),
});

type GabineteFormValues = z.infer<typeof gabineteSchema>;

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
  formData: FormData,
): Promise<CreateGabineteState> {
  const parsed = gabineteSchema.safeParse({
    [GABINETE_FIELD_NAMES.nome]: String(formData.get(GABINETE_FIELD_NAMES.nome) ?? ''),
    [GABINETE_FIELD_NAMES.esfera]: String(formData.get(GABINETE_FIELD_NAMES.esfera) ?? ''),
    [GABINETE_FIELD_NAMES.orgaoCasaLegislativa]: String(formData.get(GABINETE_FIELD_NAMES.orgaoCasaLegislativa) ?? ''),
  });

  if (!parsed.success) {
    return {
      error: 'Revise os campos obrigatórios.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const gabineteToInsert: GabineteFormValues = {
      nome: parsed.data.nome,
      esfera: parsed.data.esfera,
      orgao_casa_legislativa: parsed.data.orgao_casa_legislativa,
    };

    const { error } = await supabase.schema('public').from('gabinetes').insert(gabineteToInsert);

    if (error) {
      return { error: `Não foi possível criar o gabinete: ${error.message}` };
    }

    revalidatePath('/gabinetes');

    return { success: 'Gabinete criado com sucesso.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao criar gabinete.';
    return { error: `Não foi possível criar o gabinete: ${message}` };
  }
}
