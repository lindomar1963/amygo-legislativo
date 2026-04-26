'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { BIBLIOTECA_ESFERAS, BIBLIOTECA_FIELD_NAMES, BIBLIOTECA_TIPOS } from '@/lib/biblioteca/form-fields';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/users/ensure-user-profile';
import type { Database } from '@/types/database';

type NormaInsert = Database['public']['Tables']['biblioteca_normas']['Insert'];

const optionalText = z.string().trim().optional();

const normaSchema = z.object({
  [BIBLIOTECA_FIELD_NAMES.titulo]: z.string().trim().min(1, 'Titulo e obrigatorio.'),
  [BIBLIOTECA_FIELD_NAMES.esfera]: z.enum(BIBLIOTECA_ESFERAS, {
    errorMap: () => ({ message: 'Esfera invalida.' })
  }),
  [BIBLIOTECA_FIELD_NAMES.uf]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.municipio]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.orgaoOrigem]: z.string().trim().min(1, 'Orgao de origem e obrigatorio.'),
  [BIBLIOTECA_FIELD_NAMES.tipo]: z.enum(BIBLIOTECA_TIPOS, {
    errorMap: () => ({ message: 'Tipo de norma invalido.' })
  }),
  [BIBLIOTECA_FIELD_NAMES.numero]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.ano]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.tema]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.ementa]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.textoIntegral]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.fonteUrl]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.arquivoUrl]: optionalText
});

export type CreateNormaState = {
  success?: string;
  error?: string;
  fieldErrors?: {
    titulo?: string[];
    esfera?: string[];
    uf?: string[];
    municipio?: string[];
    orgao_origem?: string[];
    tipo?: string[];
    numero?: string[];
    ano?: string[];
    tema?: string[];
    ementa?: string[];
    texto_integral?: string[];
    fonte_url?: string[];
    arquivo_url?: string[];
  };
};

function emptyToNull(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

export async function createBibliotecaNorma(
  _prevState: CreateNormaState | null,
  formData: FormData
): Promise<CreateNormaState> {
  const parsed = normaSchema.safeParse({
    [BIBLIOTECA_FIELD_NAMES.titulo]: String(formData.get(BIBLIOTECA_FIELD_NAMES.titulo) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.esfera]: String(formData.get(BIBLIOTECA_FIELD_NAMES.esfera) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.uf]: String(formData.get(BIBLIOTECA_FIELD_NAMES.uf) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.municipio]: String(formData.get(BIBLIOTECA_FIELD_NAMES.municipio) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.orgaoOrigem]: String(formData.get(BIBLIOTECA_FIELD_NAMES.orgaoOrigem) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.tipo]: String(formData.get(BIBLIOTECA_FIELD_NAMES.tipo) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.numero]: String(formData.get(BIBLIOTECA_FIELD_NAMES.numero) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.ano]: String(formData.get(BIBLIOTECA_FIELD_NAMES.ano) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.tema]: String(formData.get(BIBLIOTECA_FIELD_NAMES.tema) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.ementa]: String(formData.get(BIBLIOTECA_FIELD_NAMES.ementa) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.textoIntegral]: String(formData.get(BIBLIOTECA_FIELD_NAMES.textoIntegral) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.fonteUrl]: String(formData.get(BIBLIOTECA_FIELD_NAMES.fonteUrl) ?? ''),
    [BIBLIOTECA_FIELD_NAMES.arquivoUrl]: String(formData.get(BIBLIOTECA_FIELD_NAMES.arquivoUrl) ?? '')
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
    return { error: 'Sessao expirada. Entre novamente para cadastrar a norma.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Nao foi possivel preparar o cadastro da norma.'
    };
  }

  const ano = parsed.data.ano ? Number(parsed.data.ano) : null;

  if (ano !== null && (!Number.isInteger(ano) || ano < 1800 || ano > 2200)) {
    return {
      error: 'Informe um ano valido.',
      fieldErrors: { ano: ['Informe um ano valido.'] }
    };
  }

  const normaToInsert: NormaInsert = {
    owner_user_id: user.id,
    titulo: parsed.data.titulo,
    esfera: parsed.data.esfera,
    uf: emptyToNull(parsed.data.uf?.toUpperCase()),
    municipio: emptyToNull(parsed.data.municipio),
    orgao_origem: parsed.data.orgao_origem,
    tipo: parsed.data.tipo,
    numero: emptyToNull(parsed.data.numero),
    ano,
    tema: emptyToNull(parsed.data.tema),
    ementa: emptyToNull(parsed.data.ementa),
    texto_integral: emptyToNull(parsed.data.texto_integral),
    fonte_url: emptyToNull(parsed.data.fonte_url),
    arquivo_url: emptyToNull(parsed.data.arquivo_url)
  };

  const { error } = await admin.from('biblioteca_normas').insert(normaToInsert);

  if (error) {
    return { error: `Nao foi possivel cadastrar a norma: ${error.message}` };
  }

  revalidatePath('/biblioteca-legislativa');

  return { success: 'Norma cadastrada na biblioteca.' };
}
