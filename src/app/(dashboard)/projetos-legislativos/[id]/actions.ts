'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/users/ensure-user-profile';
import type { Database } from '@/types/database';

export type AddProjetoReferenciaState = {
  success?: string;
  error?: string;
};

export type GenerateAnaliseComparativaState = {
  success?: string;
  error?: string;
};

export type ApproveMinutaState = {
  success?: string;
  error?: string;
};

export type GenerateJustificativaState = {
  success?: string;
  error?: string;
};

export type RegisterDocxExportState = {
  success?: string;
  error?: string;
};

type ProjetoAnalise = {
  id: string;
  titulo: string;
  ementa: string | null;
  tipo: 'PL' | 'PEC' | 'requerimento' | 'indicacao' | 'outro';
  gabinete_id: string;
};

type GabineteAnalise = {
  nome: string;
  esfera: 'municipal' | 'estadual' | 'federal';
  orgao_casa_legislativa: string;
} | null;

type NormaAnalise = {
  titulo: string;
  esfera: 'municipal' | 'estadual' | 'federal';
  uf: string | null;
  municipio: string | null;
  orgao_origem: string;
  tipo: 'lei' | 'lei_complementar' | 'decreto' | 'resolucao' | 'outro';
  numero: string | null;
  ano: number | null;
  tema: string | null;
  ementa: string | null;
  texto_integral: string | null;
  fonte_url: string | null;
};

type WorkflowStatus = Database['public']['Tables']['projetos_legislativos']['Row']['workflow_status'];
type AdminClient = ReturnType<typeof createAdminClient>;

type GenerationOperation = 'generate_minuta' | 'approve_minuta' | 'generate_justificativa' | 'export_docx';
type GenerationStatus = 'success' | 'failed';

function elapsedMs(startedAt: number) {
  return Date.now() - startedAt;
}

async function logGenerationEvent({
  admin,
  projetoId,
  userId,
  operation,
  status,
  executionTime,
  modelUsed,
  fromStatus,
  toStatus,
  message
}: {
  admin: AdminClient;
  projetoId: string;
  userId: string;
  operation: GenerationOperation;
  status: GenerationStatus;
  executionTime: number;
  modelUsed?: string | null;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  message: string;
}) {
  const { error } = await admin.from('generation_logs').insert({
    project_id: projetoId,
    stage: operation,
    request_payload: {
      operation,
      status,
      project_id: projetoId,
      actor_user_id: userId,
      workflow_status_from: fromStatus,
      workflow_status_to: toStatus
    },
    response_payload: {
      operation,
      status,
      execution_time: executionTime,
      model_used: modelUsed ?? null,
      project_id: projetoId,
      message
    },
    success: status === 'success'
  });

  if (error) {
    return `Status atualizado, mas não foi possível registrar em generation_logs: ${error.message}`;
  }

  return null;
}

function normaLabel(norma: NormaAnalise) {
  const numeroAno = [norma.numero ? `n. ${norma.numero}` : null, norma.ano ? `/${norma.ano}` : null]
    .filter(Boolean)
    .join('');
  const local = [norma.esfera, norma.uf, norma.municipio].filter(Boolean).join(' - ');

  return `${norma.titulo}${numeroAno ? ` (${numeroAno})` : ''} - ${local}`;
}

function excerpt(value: string | null | undefined, maxLength = 900) {
  if (!value) return 'Sem texto integral cadastrado.';
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function normalizeLegislativeOrdinals(value: string) {
  return value.replace(/\bArt\. (\d+)o\b/g, 'Art. $1º');
}

function buildAnaliseComparativa({
  projeto,
  gabinete,
  normas
}: {
  projeto: ProjetoAnalise;
  gabinete: GabineteAnalise;
  normas: NormaAnalise[];
}) {
  const gabineteDestino = gabinete
    ? `${gabinete.nome} - ${gabinete.orgao_casa_legislativa} (${gabinete.esfera})`
    : 'Gabinete não localizado';
  const normasTexto = normas
    .map(
      (norma, index) => `${index + 1}. ${normaLabel(norma)}
Origem: ${norma.orgao_origem}
Tema: ${norma.tema ?? 'Não informado'}
Ementa: ${norma.ementa ?? 'Sem ementa cadastrada.'}
Fonte: ${norma.fonte_url ?? 'Não informada'}
Trecho de apoio: ${excerpt(norma.texto_integral)}`
    )
    .join('\n\n');

  return normalizeLegislativeOrdinals(`ANÁLISE COMPARATIVA PRELIMINAR

Projeto: ${projeto.titulo}
Tipo: ${projeto.tipo}
Gabinete solicitante: ${gabineteDestino}
Ementa/resumo do projeto: ${projeto.ementa ?? 'Sem ementa cadastrada.'}

NORMAS USADAS COMO REFERÊNCIA

${normasTexto}

PONTOS APROVEITÁVEIS

1. Usar a norma de referência como matriz de organização temática, preservando apenas o que for compatível com a competência do ente solicitante.
2. Aproveitar conceitos, definições e justificativas que dialoguem diretamente com a finalidade do projeto.
3. Manter registro da origem da norma, do número, do ano e do órgão responsável para permitir auditoria da adaptação.

PONTOS QUE EXIGEM ADAPTAÇÃO

1. Ajustar todos os órgãos, autoridades e procedimentos para a realidade de ${gabinete?.orgao_casa_legislativa ?? 'seu órgão legislativo'}.
2. Conferir se a matéria pertence à competência ${gabinete?.esfera ?? 'do gabinete'} antes de protocolar.
3. Revisar prazos, despesas, fonte orçamentária e eventuais atribuições ao Poder Executivo.
4. Remover referências locais que pertençam exclusivamente ao ente federativo da norma original.

RISCOS E CUIDADOS LEGISLATIVOS

1. Verificar constitucionalidade formal e material.
2. Evitar criação de obrigações administrativas sem previsão de impacto ou competência.
3. Conferir se já existe norma local sobre o mesmo tema.
4. Submeter a minuta à revisão jurídica antes de protocolo.

MINUTA BASE PARA DESENVOLVIMENTO

PROJETO DE LEI

Ementa: ${projeto.ementa ?? 'Dispõe sobre matéria a ser detalhada conforme a finalidade do projeto.'}

Art. 1º Fica instituída, no âmbito de ${gabinete?.orgao_casa_legislativa ?? 'ente competente'}, a disciplina relacionada ao tema objeto deste projeto, conforme a finalidade indicada na ementa.

Art. 2º Para os fins desta Lei, deverão ser observados os princípios da legalidade, eficiência, transparência, interesse público e adequação à realidade local.

Art. 3º O Poder competente poderá regulamentar esta Lei, quando necessário, respeitadas as competências constitucionais e legais aplicáveis.

Art. 4º As despesas decorrentes da execução desta Lei, quando houver, correrão por conta das dotações orçamentárias próprias, observada a legislação fiscal vigente.

Art. 5º Esta Lei entra em vigor na data de sua publicação.

OBSERVAÇÃO

Este texto é uma versão preliminar. A justificativa deve ser elaborada somente após validação técnica da minuta.`);
}

function assertMinutaApproved(approved_minuta: boolean) {
  if (!approved_minuta) {
    throw new Error('Minuta precisa ser validada antes da elaboração da justificativa.');
  }
}

function buildJustificativa({
  titulo,
  ementa,
  gabineteNome,
  orgaoCasaLegislativa
}: {
  titulo: string;
  ementa: string | null;
  gabineteNome: string | null;
  orgaoCasaLegislativa: string | null;
}) {
  return `JUSTIFICATIVA

Senhor Presidente,
Senhoras e Senhores Parlamentares,

Submetemos à apreciação desta Casa Legislativa o presente projeto, intitulado "${titulo}", que tem por finalidade ${ementa ?? 'disciplinar matéria de interesse público conforme a minuta validada'}.

A proposta foi elaborada a partir de análise técnica e comparativa de norma de referência, respeitando a necessidade de adequação à realidade institucional de ${orgaoCasaLegislativa ?? 'seu órgão legislativo'}.

Sob o aspecto administrativo, a medida busca conferir maior segurança jurídica, previsibilidade e organização normativa ao tema tratado, permitindo que a execução da política pública ocorra de forma compatível com os princípios da legalidade, eficiência, transparência e interesse público.

Quanto ao impacto orçamentário, quando houver necessidade de despesa pública, sua execução deverá observar as dotações orçamentárias próprias e a legislação fiscal vigente.

Ressalta-se que a minuta foi submetida à validação técnica antes da elaboração da justificativa, em observância ao procedimento oficial do Amygo Legislativo.

Diante do exposto, contamos com o apoio dos nobres pares para a aprovação da presente proposição.

${gabineteNome ?? 'Gabinete responsável'}`;
}

export async function addProjetoNormaReferencia(
  _prevState: AddProjetoReferenciaState | null,
  formData: FormData
): Promise<AddProjetoReferenciaState> {
  const projetoId = String(formData.get('projeto_id') ?? '');
  const normaId = String(formData.get('norma_id') ?? '');

  if (!projetoId || !normaId) {
    return { error: 'Projeto e norma sao obrigatorios.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessão expirada. Entre novamente para vincular a norma.' };
  }

  const [projeto, norma] = await Promise.all([
    supabase.from('projetos_legislativos').select('id').eq('id', projetoId).single(),
    supabase.from('biblioteca_normas').select('id').eq('id', normaId).single()
  ]);

  if (projeto.error || !projeto.data) {
    return { error: 'Projeto não encontrado ou não vinculado ao seu usuário.' };
  }

  if (norma.error || !norma.data) {
    return { error: 'Norma não encontrada na sua biblioteca.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Não foi possível preparar o vínculo da norma.'
    };
  }

  const { error } = await admin.from('projeto_normas_referencias').upsert(
    {
      projeto_id: projetoId,
      norma_id: normaId,
      created_by: user.id
    },
    { onConflict: 'projeto_id,norma_id' }
  );

  if (error) {
    return { error: `Não foi possível usar a norma como referência: ${error.message}` };
  }

  revalidatePath(`/projetos-legislativos/${projetoId}`);

  return { success: 'Norma marcada como referencia do projeto.' };
}

export async function generateAnaliseComparativa(
  _prevState: GenerateAnaliseComparativaState | null,
  formData: FormData
): Promise<GenerateAnaliseComparativaState> {
  const startedAt = Date.now();
  const projetoId = String(formData.get('projeto_id') ?? '');

  if (!projetoId) {
    return { error: 'Projeto obrigatório para gerar a análise.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessão expirada. Entre novamente para gerar a análise.' };
  }

  const projeto = await supabase
    .from('projetos_legislativos')
    .select('id, titulo, ementa, tipo, gabinete_id, workflow_status')
    .eq('id', projetoId)
    .single();

  if (projeto.error || !projeto.data) {
    return { error: 'Projeto não encontrado ou não vinculado ao seu usuário.' };
  }

  const [gabinete, referencias] = await Promise.all([
    supabase
      .from('gabinetes')
      .select('nome, esfera, orgao_casa_legislativa')
      .eq('id', projeto.data.gabinete_id)
      .single(),
    supabase.from('projeto_normas_referencias').select('norma_id').eq('projeto_id', projetoId)
  ]);

  if (referencias.error) {
    return { error: `Não foi possível carregar as normas de referência: ${referencias.error.message}` };
  }

  const normaIds = (referencias.data ?? []).map((referencia) => referencia.norma_id);

  if (normaIds.length === 0) {
    return { error: 'Marque uma norma da biblioteca como referência antes de gerar a análise.' };
  }

  const normas = await supabase
    .from('biblioteca_normas')
    .select('titulo, esfera, uf, municipio, orgao_origem, tipo, numero, ano, tema, ementa, texto_integral, fonte_url')
    .in('id', normaIds);

  if (normas.error || !normas.data?.length) {
    return { error: normas.error?.message ?? 'Nenhuma norma de referencia foi encontrada na biblioteca.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Não foi possível preparar a análise.'
    };
  }

  const latestVersion = await admin
    .from('projeto_versoes')
    .select('numero_versao')
    .eq('projeto_id', projetoId)
    .order('numero_versao', { ascending: false })
    .limit(1);

  if (latestVersion.error) {
    return { error: `Não foi possível calcular a próxima versão: ${latestVersion.error.message}` };
  }

  const nextVersion = ((latestVersion.data?.[0]?.numero_versao as number | undefined) ?? 0) + 1;
  const conteudo = buildAnaliseComparativa({
    projeto: projeto.data,
    gabinete: gabinete.data ?? null,
    normas: normas.data
  });

  const { error } = await admin.from('projeto_versoes').insert({
    projeto_id: projetoId,
    numero_versao: nextVersion,
    conteudo_texto: conteudo,
    resumo_alteracoes: 'Análise comparativa preliminar e minuta-base elaboradas a partir das normas de referência.',
    criado_por: user.id,
    origem: 'ia'
  });

  if (error) {
    return { error: `Não foi possível salvar a análise comparativa: ${error.message}` };
  }

  const nextWorkflowStatus: WorkflowStatus = 'minuta_generated';
  const { error: workflowError } = await admin
    .from('projetos_legislativos')
    .update({
      workflow_status: nextWorkflowStatus,
      status_fluxo: 'em_revisao',
      approved_minuta: false
    })
    .eq('id', projetoId);

  if (workflowError) {
    return {
      error: `Minuta salva, mas não foi possível atualizar o status do fluxo: ${workflowError.message}`
    };
  }

  const logError = await logGenerationEvent({
    admin,
    projetoId,
    userId: user.id,
    operation: 'generate_minuta',
    status: 'success',
    executionTime: elapsedMs(startedAt),
    modelUsed: 'template-local',
    fromStatus: projeto.data.workflow_status,
    toStatus: nextWorkflowStatus,
    message: `Análise comparativa e minuta elaboradas como versão ${nextVersion}.`
  });

  if (logError) {
    return { error: logError };
  }

  revalidatePath(`/projetos-legislativos/${projetoId}`);

  return { success: `Análise comparativa elaborada como versão ${nextVersion}.` };
}

export async function approveMinuta(
  _prevState: ApproveMinutaState | null,
  formData: FormData
): Promise<ApproveMinutaState> {
  const startedAt = Date.now();
  const projetoId = String(formData.get('projeto_id') ?? '');

  if (!projetoId) {
    return { error: 'Projeto obrigatorio para aprovar a minuta.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessão expirada. Entre novamente para validar a minuta.' };
  }

  const projeto = await supabase
    .from('projetos_legislativos')
    .select('id, workflow_status')
    .eq('id', projetoId)
    .single();

  if (projeto.error || !projeto.data) {
    return { error: 'Projeto não encontrado ou não vinculado ao seu usuário.' };
  }

  const versoes = await supabase
    .from('projeto_versoes')
    .select('id')
    .eq('projeto_id', projetoId)
    .limit(1);

  if (versoes.error || !versoes.data?.length) {
    return { error: 'Gere uma minuta antes de aprovar.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Não foi possível preparar a validação da minuta.'
    };
  }

  const nextWorkflowStatus: WorkflowStatus = 'minuta_approved';
  const { error } = await admin
    .from('projetos_legislativos')
    .update({
      approved_minuta: true,
      workflow_status: nextWorkflowStatus,
      status_fluxo: 'aprovado_interno'
    })
    .eq('id', projetoId);

  if (error) {
    return { error: `Não foi possível validar a minuta: ${error.message}` };
  }

  const logError = await logGenerationEvent({
    admin,
    projetoId,
    userId: user.id,
    operation: 'approve_minuta',
    status: 'success',
    executionTime: elapsedMs(startedAt),
    modelUsed: null,
    fromStatus: projeto.data.workflow_status,
    toStatus: nextWorkflowStatus,
    message: 'Minuta validada após validação técnica.'
  });

  if (logError) {
    return { error: logError };
  }

  revalidatePath(`/projetos-legislativos/${projetoId}`);

  return { success: 'Minuta validada. A justificativa pode ser elaborada na próxima etapa.' };
}

export async function generateJustificativa(
  _prevState: GenerateJustificativaState | null,
  formData: FormData
): Promise<GenerateJustificativaState> {
  const startedAt = Date.now();
  const projetoId = String(formData.get('projeto_id') ?? '');

  if (!projetoId) {
    return { error: 'Projeto obrigatório para elaborar justificativa.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessão expirada. Entre novamente para elaborar a justificativa.' };
  }

  const projeto = await supabase
    .from('projetos_legislativos')
    .select('id, titulo, ementa, gabinete_id, approved_minuta, workflow_status')
    .eq('id', projetoId)
    .single();

  if (projeto.error || !projeto.data) {
    return { error: 'Projeto não encontrado ou não vinculado ao seu usuário.' };
  }

  try {
    assertMinutaApproved(projeto.data.approved_minuta);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Minuta ainda não validada.' };
  }

  const [gabinete, latestVersion] = await Promise.all([
    supabase
      .from('gabinetes')
      .select('nome, orgao_casa_legislativa')
      .eq('id', projeto.data.gabinete_id)
      .single(),
    supabase
      .from('projeto_versoes')
      .select('numero_versao')
      .eq('projeto_id', projetoId)
      .order('numero_versao', { ascending: false })
      .limit(1)
  ]);

  if (latestVersion.error || !latestVersion.data?.length) {
    return { error: 'Não há minuta versionada para justificar.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Não foi possível preparar a elaboração da justificativa.'
    };
  }

  const nextVersion = ((latestVersion.data[0]?.numero_versao as number | undefined) ?? 0) + 1;
  const conteudo = buildJustificativa({
    titulo: projeto.data.titulo,
    ementa: projeto.data.ementa,
    gabineteNome: gabinete.data?.nome ?? null,
    orgaoCasaLegislativa: gabinete.data?.orgao_casa_legislativa ?? null
  });

  const { error: versaoError } = await admin.from('projeto_versoes').insert({
    projeto_id: projetoId,
    numero_versao: nextVersion,
    conteudo_texto: conteudo,
    resumo_alteracoes: 'Justificativa elaborada após validação da minuta-base.',
    criado_por: user.id,
    origem: 'ia'
  });

  if (versaoError) {
    return { error: `Não foi possível salvar a justificativa: ${versaoError.message}` };
  }

  const nextWorkflowStatus: WorkflowStatus = 'justificativa_generated';
  const { error: workflowError } = await admin
    .from('projetos_legislativos')
    .update({
      workflow_status: nextWorkflowStatus
    })
    .eq('id', projetoId);

  if (workflowError) {
    return {
      error: `Justificativa salva, mas não foi possível atualizar o status do fluxo: ${workflowError.message}`
    };
  }

  const logError = await logGenerationEvent({
    admin,
    projetoId,
    userId: user.id,
    operation: 'generate_justificativa',
    status: 'success',
    executionTime: elapsedMs(startedAt),
    modelUsed: 'template-local',
    fromStatus: projeto.data.workflow_status,
    toStatus: nextWorkflowStatus,
    message: `Justificativa elaborada como versão ${nextVersion}.`
  });

  if (logError) {
    return { error: logError };
  }

  revalidatePath(`/projetos-legislativos/${projetoId}`);

  return { success: `Justificativa elaborada como versão ${nextVersion}.` };
}

export async function registerDocxExport(
  _prevState: RegisterDocxExportState | null,
  formData: FormData
): Promise<RegisterDocxExportState> {
  const startedAt = Date.now();
  const projetoId = String(formData.get('projeto_id') ?? '');

  if (!projetoId) {
    return { error: 'Projeto obrigatório para registrar exportação DOCX.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessão expirada. Entre novamente para registrar exportação DOCX.' };
  }

  const projeto = await supabase
    .from('projetos_legislativos')
    .select('id, workflow_status')
    .eq('id', projetoId)
    .single();

  if (projeto.error || !projeto.data) {
    return { error: 'Projeto não encontrado ou não vinculado ao seu usuário.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Não foi possível preparar o registro da exportação DOCX.'
    };
  }

  const nextWorkflowStatus: WorkflowStatus = 'docx_exported';
  const { error: workflowError } = await admin
    .from('projetos_legislativos')
    .update({
      workflow_status: nextWorkflowStatus
    })
    .eq('id', projetoId);

  if (workflowError) {
    return {
      error: `DOCX exportado, mas não foi possível atualizar o status do fluxo: ${workflowError.message}`
    };
  }

  const logError = await logGenerationEvent({
    admin,
    projetoId,
    userId: user.id,
    operation: 'export_docx',
    status: 'success',
    executionTime: elapsedMs(startedAt),
    modelUsed: null,
    fromStatus: projeto.data.workflow_status,
    toStatus: nextWorkflowStatus,
    message: 'Exportação DOCX registrada no pipeline oficial.'
  });

  if (logError) {
    return { error: logError };
  }

  revalidatePath(`/projetos-legislativos/${projetoId}`);

  return { success: 'Exportação DOCX registrada no generation_logs.' };
}
