'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const gabineteSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório.'),
  esfera: z.enum(['municipal', 'estadual', 'federal'], {
    errorMap: () => ({ message: 'Esfera inválida.' }),
  }),
  orgao_casa_legislativa: z.string().trim().min(1, 'Órgão/Casa legislativa é obrigatório.'),
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
  formData: FormData,
): Promise<CreateGabineteState> {
  const parsed = gabineteSchema.safeParse({
    nome: String(formData.get('nome') ?? ''),
    esfera: String(formData.get('esfera') ?? ''),
    orgao_casa_legislativa: String(formData.get('orgao_casa_legislativa') ?? ''),
  });

  if (!parsed.success) {
    return {
      error: 'Revise os campos obrigatórios.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('gabinetes').insert(parsed.data);

  if (error) {
    return { error: `Não foi possível criar o gabinete: ${error.message}` };
  }

  revalidatePath('/gabinetes');

  return { success: 'Gabinete criado com sucesso.' };
}
