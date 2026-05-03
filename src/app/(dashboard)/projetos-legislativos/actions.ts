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

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === '42P01' ||
        error.message?.includes('gabinete_licencas') ||
        error.message?.includes('schema cache'))
  );
}

function getMonthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

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

  const [licencaResult, projetosMesResult] = await Promise.all([
    supabase
      .from('gabinete_licencas')
      .select('limite_projetos_mes, status')
      .eq('gabinete_id', parsed.data.gabinete_id)
      .maybeSingle(),
    supabase
      .from('projetos_legislativos')
      .select('id', { count: 'exact', head: true })
      .eq('gabinete_id', parsed.data.gabinete_id)
      .gte('created_at', getMonthStartIso())
  ]);

  if (licencaResult.error && !isMissingTableError(licencaResult.error)) {
    return { error: `Nao foi possivel validar a licenca do gabinete: ${licencaResult.error.message}` };
  }

  if (projetosMesResult.error) {
    return { error: `Nao foi possivel conferir o limite mensal de projetos: ${projetosMesResult.error.message}` };
  }

  const limiteProjetosMes = licencaResult.data?.limite_projetos_mes ?? 30;
  if (licencaResult.data?.status && licencaResult.data.status !== 'ativo') {
    return { error: 'A licenca deste gabinete nao esta ativa para criacao de novos projetos.' };
  }

  if ((projetosMesResult.count ?? 0) >= limiteProjetosMes) {
    return { error: `Limite mensal de ${limiteProjetosMes} projetos atingido para este gabinete.` };
  }

  const projetoToInsert: ProjetoInsert = {
    gabinete_id: parsed.data.gabinete_id,
    titulo: parsed.data.titulo,
    tipo: parsed.data.tipo,
    ementa: parsed.data.ementa || null,
    status_fluxo: 'rascunho',
    workflow_status: 'draft',
    approved_minuta: false,
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
  revalidatePath('/equipe-licenca');

  return {
    success: 'Projeto legislativo criado com sucesso.',
    projetoId: projeto.id
  };
}
