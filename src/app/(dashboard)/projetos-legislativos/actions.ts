'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { PROJETO_FIELD_NAMES, PROJETO_TIPOS } from '@/lib/projetos/form-fields';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/users/ensure-user-profile';
import type { Database } from '@/types/database';

type ProjetoInsert = Database['public']['Tables']['projetos_legislativos']['Insert'];

const projetoSchema = z.object({
  [PROJETO_FIELD_NAMES.gabineteId]: z.string().uuid('Selecione um gabinete valido.'),
  [PROJETO_FIELD_NAMES.titulo]: z.string().trim().min(1, 'Titulo e obrigatorio.'),
  [PROJETO_FIELD_NAMES.tipo]: z.enum(PROJETO_TIPOS, {
    errorMap: () => ({ message: 'Tipo de projeto invalido.' })
  }),
  [PROJETO_FIELD_NAMES.ementa]: z.string().trim().optional()
});

export type CreateProjetoState = {
  success?: string;
  error?: string;
  projetoId?: string;
  fieldErrors?: {
    gabinete_id?: string[];
    titulo?: string[];
    tipo?: string[];
    ementa?: string[];
  };
};

export async function createProjeto(
  _prevState: CreateProjetoState | null,
  formData: FormData
): Promise<CreateProjetoState> {
  const parsed = projetoSchema.safeParse({
    [PROJETO_FIELD_NAMES.gabineteId]: String(formData.get(PROJETO_FIELD_NAMES.gabineteId) ?? ''),
    [PROJETO_FIELD_NAMES.titulo]: String(formData.get(PROJETO_FIELD_NAMES.titulo) ?? ''),
    [PROJETO_FIELD_NAMES.tipo]: String(formData.get(PROJETO_FIELD_NAMES.tipo) ?? ''),
    [PROJETO_FIELD_NAMES.ementa]: String(formData.get(PROJETO_FIELD_NAMES.ementa) ?? '')
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
    return { error: 'Sessao expirada. Entre novamente para criar o projeto.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Nao foi possivel preparar a criacao do projeto.'
    };
  }

  const { data: gabinete, error: gabineteError } = await supabase
    .from('gabinetes')
    .select('id')
    .eq('id', parsed.data.gabinete_id)
    .single();

  if (gabineteError || !gabinete) {
    return { error: 'Selecione um gabinete vinculado ao seu usuario.' };
  }

  const projetoToInsert: ProjetoInsert = {
    gabinete_id: parsed.data.gabinete_id,
    titulo: parsed.data.titulo,
    tipo: parsed.data.tipo,
    ementa: parsed.data.ementa || null,
    status_fluxo: 'rascunho',
    autor_responsavel_id: user.id
  };

  const { data: projeto, error: projetoError } = await admin
    .from('projetos_legislativos')
    .insert(projetoToInsert)
    .select('id')
    .single();

  if (projetoError || !projeto) {
    return { error: `Nao foi possivel criar o projeto: ${projetoError?.message ?? 'resposta sem projeto criado'}` };
  }

  revalidatePath('/dashboard');
  revalidatePath('/projetos-legislativos');

  return {
    success: 'Projeto legislativo criado com sucesso.',
    projetoId: projeto.id
  };
}
