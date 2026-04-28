'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { BIBLIOTECA_ESFERAS, BIBLIOTECA_FIELD_NAMES, BIBLIOTECA_TIPOS } from '@/lib/biblioteca/form-fields';
import { extractImportedText, PDF_SCAN_ERROR } from '@/lib/biblioteca/importers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/users/ensure-user-profile';
import type { Database } from '@/types/database';

type NormaInsert = Database['public']['Tables']['biblioteca_normas']['Insert'];
type AdminClient = ReturnType<typeof createAdminClient>;

const optionalText = z.string().trim().optional();
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const IMPORT_BUCKET = 'biblioteca-normas';

const normaSchema = z.object({
  [BIBLIOTECA_FIELD_NAMES.titulo]: z.string().trim().min(1, 'Título é obrigatório.'),
  [BIBLIOTECA_FIELD_NAMES.esfera]: z.enum(BIBLIOTECA_ESFERAS, {
    errorMap: () => ({ message: 'Esfera inválida.' })
  }),
  [BIBLIOTECA_FIELD_NAMES.uf]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.municipio]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.orgaoOrigem]: z.string().trim().min(1, 'Órgão de origem é obrigatório.'),
  [BIBLIOTECA_FIELD_NAMES.tipo]: z.enum(BIBLIOTECA_TIPOS, {
    errorMap: () => ({ message: 'Tipo de norma inválido.' })
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

export type ImportNormaState = CreateNormaState;

const importNormaSchema = z.object({
  import_mode: z.enum(['pdf', 'docx', 'texto', 'link']),
  [BIBLIOTECA_FIELD_NAMES.titulo]: z.string().trim().min(1, 'Título é obrigatório.'),
  [BIBLIOTECA_FIELD_NAMES.esfera]: z.enum(BIBLIOTECA_ESFERAS, {
    errorMap: () => ({ message: 'Esfera inválida.' })
  }),
  [BIBLIOTECA_FIELD_NAMES.uf]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.municipio]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.orgaoOrigem]: z.string().trim().min(1, 'Órgão de origem é obrigatório.'),
  [BIBLIOTECA_FIELD_NAMES.tipo]: z.enum(BIBLIOTECA_TIPOS, {
    errorMap: () => ({ message: 'Tipo de norma inválido.' })
  }),
  [BIBLIOTECA_FIELD_NAMES.numero]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.ano]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.tema]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.ementa]: optionalText,
  [BIBLIOTECA_FIELD_NAMES.fonteUrl]: optionalText,
  texto_colado: optionalText,
  link_oficial: optionalText
});

function emptyToNull(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

function sanitizeStorageName(value: string) {
  return value
    .normalize('NFC')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 100);
}

function validateAno(value: string | undefined) {
  const ano = value ? Number(value) : null;

  if (ano !== null && (!Number.isInteger(ano) || ano < 1800 || ano > 2200)) {
    throw new Error('Informe um ano válido.');
  }

  return ano;
}

async function ensureImportBucket(admin: AdminClient) {
  const bucket = await admin.storage.getBucket(IMPORT_BUCKET);

  if (!bucket.error) return;

  const created = await admin.storage.createBucket(IMPORT_BUCKET, {
    public: false,
    fileSizeLimit: MAX_IMPORT_BYTES
  });

  if (created.error && !created.error.message.toLowerCase().includes('already exists')) {
    throw new Error(`Não foi possível preparar o Storage: ${created.error.message}`);
  }
}

async function uploadImportedFile({
  admin,
  userId,
  file
}: {
  admin: AdminClient;
  userId: string;
  file: File;
}) {
  await ensureImportBucket(admin);

  const filename = sanitizeStorageName(file.name || 'norma-importada');
  const storagePath = `${userId}/${Date.now()}-${filename || 'norma-importada'}`;
  const { error } = await admin.storage.from(IMPORT_BUCKET).upload(storagePath, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false
  });

  if (error) {
    throw new Error(`Não foi possível salvar o arquivo no Storage: ${error.message}`);
  }

  return `storage://${IMPORT_BUCKET}/${storagePath}`;
}

async function logNormaImport({
  admin,
  userId,
  success,
  mode,
  normaId,
  error
}: {
  admin: AdminClient;
  userId: string;
  success: boolean;
  mode: string;
  normaId?: string;
  error?: string;
}) {
  await (admin as any).from('auditoria_eventos').insert({
    entidade: 'usuario',
    entidade_id: userId,
    acao: 'create',
    actor_user_id: userId,
    payload_diff: {
      stage: 'norma_imported',
      success,
      mode,
      norma_id: normaId ?? null,
      error: error ?? null
    }
  });
}

async function fetchLinkContent(link: string) {
  const response = await fetch(link, {
    headers: {
      Accept:
        'application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain, text/html;q=0.9, */*;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`Não foi possível acessar o link oficial: HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > MAX_IMPORT_BYTES) {
    throw new Error('Arquivo maior que 10MB. Envie um arquivo menor para esta versão inicial.');
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMPORT_BYTES) {
    throw new Error('Arquivo maior que 10MB. Envie um arquivo menor para esta versão inicial.');
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type'),
    filename: new URL(link).pathname.split('/').pop() || 'link-oficial'
  };
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
      error: 'Revise os campos obrigatórios.',
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessão expirada. Entre novamente para cadastrar a norma.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Não foi possível preparar o cadastro da norma.'
    };
  }

  const ano = parsed.data.ano ? Number(parsed.data.ano) : null;

  if (ano !== null && (!Number.isInteger(ano) || ano < 1800 || ano > 2200)) {
    return {
      error: 'Informe um ano válido.',
      fieldErrors: { ano: ['Informe um ano válido.'] }
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
    return { error: `Não foi possível cadastrar a norma: ${error.message}` };
  }

  revalidatePath('/biblioteca-legislativa');

  return { success: 'Norma cadastrada na biblioteca.' };
}

export async function importBibliotecaNorma(
  _prevState: ImportNormaState | null,
  formData: FormData
): Promise<ImportNormaState> {
  const parsed = importNormaSchema.safeParse({
    import_mode: String(formData.get('import_mode') ?? ''),
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
    [BIBLIOTECA_FIELD_NAMES.fonteUrl]: String(formData.get(BIBLIOTECA_FIELD_NAMES.fonteUrl) ?? ''),
    texto_colado: String(formData.get('texto_colado') ?? ''),
    link_oficial: String(formData.get('link_oficial') ?? '')
  });

  if (!parsed.success) {
    return {
      error: 'Revise os campos obrigatórios.',
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessão expirada. Entre novamente para importar a norma.' };
  }

  let admin: AdminClient;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Não foi possível preparar a importação da norma.'
    };
  }

  try {
    const ano = validateAno(parsed.data.ano);
    let textoIntegral = '';
    let arquivoUrl: string | null = null;
    let fonteUrl = emptyToNull(parsed.data.fonte_url);

    if (parsed.data.import_mode === 'texto') {
      textoIntegral = parsed.data.texto_colado ?? '';
      if (!textoIntegral.trim()) {
        throw new Error('Cole o texto da norma antes de importar.');
      }
    }

    if (parsed.data.import_mode === 'link') {
      const link = parsed.data.link_oficial || parsed.data.fonte_url;
      if (!link) {
        throw new Error('Informe o link oficial da norma.');
      }
      fonteUrl = link;
      const fetched = await fetchLinkContent(link);
      textoIntegral = extractImportedText(fetched);
    }

    if (parsed.data.import_mode === 'pdf' || parsed.data.import_mode === 'docx') {
      const file = formData.get('arquivo_norma');
      if (!(file instanceof File) || file.size === 0) {
        throw new Error('Selecione um arquivo para importar.');
      }
      if (file.size > MAX_IMPORT_BYTES) {
        throw new Error('Arquivo maior que 10MB. Envie um arquivo menor para esta versão inicial.');
      }

      const expectedExtension = parsed.data.import_mode === 'pdf' ? '.pdf' : '.docx';
      if (!file.name.toLowerCase().endsWith(expectedExtension)) {
        throw new Error(`Envie um arquivo ${expectedExtension.toUpperCase()} válido.`);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      textoIntegral = extractImportedText({ buffer, contentType: file.type, filename: file.name });
      arquivoUrl = await uploadImportedFile({ admin, userId: user.id, file });
    }

    if (!textoIntegral.trim()) {
      throw new Error('Não foi possível extrair texto da norma.');
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
      texto_integral: textoIntegral,
      fonte_url: fonteUrl,
      arquivo_url: arquivoUrl
    };

    const { data: norma, error } = await admin
      .from('biblioteca_normas')
      .insert(normaToInsert)
      .select('id')
      .single();

    if (error || !norma) {
      throw new Error(`Não foi possível importar a norma: ${error?.message ?? 'resposta sem norma criada'}`);
    }

    await logNormaImport({
      admin,
      userId: user.id,
      success: true,
      mode: parsed.data.import_mode,
      normaId: norma.id
    });

    revalidatePath('/biblioteca-legislativa');

    return { success: 'Norma importada para a biblioteca.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível importar a norma.';
    await logNormaImport({
      admin,
      userId: user.id,
      success: false,
      mode: parsed.data.import_mode,
      error: message
    });

    return { error: message === PDF_SCAN_ERROR ? PDF_SCAN_ERROR : message };
  }
}
