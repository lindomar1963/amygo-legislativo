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
    return `Status atualizado, mas nao foi possivel registrar em generation_logs: ${error.message}`;
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
    : 'Gabinete nao localizado';
  const normasTexto = normas
    .map(
      (norma, index) => `${index + 1}. ${normaLabel(norma)}
Origem: ${norma.orgao_origem}
Tema: ${norma.tema ?? 'Nao informado'}
Ementa: ${norma.ementa ?? 'Sem ementa cadastrada.'}
Fonte: ${norma.fonte_url ?? 'Nao informada'}
Trecho de apoio: ${excerpt(norma.texto_integral)}`
    )
    .join('\n\n');

  return `ANALISE COMPARATIVA PRELIMINAR

Projeto: ${projeto.titulo}
Tipo: ${projeto.tipo}
Gabinete solicitante: ${gabineteDestino}
Ementa/resumo do projeto: ${projeto.ementa ?? 'Sem ementa cadastrada.'}

NORMAS USADAS COMO REFERENCIA

${normasTexto}

PONTOS APROVEITAVEIS

1. Usar a norma de referencia como matriz de organizacao tematica, preservando apenas o que for compativel com a competencia do ente solicitante.
2. Aproveitar conceitos, definicoes e justificativas que dialoguem diretamente com a finalidade do projeto.
3. Manter registro da origem da norma, do numero, do ano e do orgao responsavel para permitir auditoria da adaptacao.

PONTOS QUE EXIGEM ADAPTACAO

1. Ajustar todos os orgaos, autoridades e procedimentos para a realidade de ${gabinete?.orgao_casa_legislativa ?? 'seu orgao legislativo'}.
2. Conferir se a materia pertence a competencia ${gabinete?.esfera ?? 'do gabinete'} antes de protocolar.
3. Revisar prazos, despesas, fonte orcamentaria e eventuais atribuicoes ao Poder Executivo.
4. Remover referencias locais que pertencam exclusivamente ao ente federativo da norma original.

RISCOS E CUIDADOS LEGISLATIVOS

1. Verificar constitucionalidade formal e material.
2. Evitar criacao de obrigacoes administrativas sem previsao de impacto ou competencia.
3. Conferir se ja existe norma local sobre o mesmo tema.
4. Submeter a minuta a revisao juridica antes de protocolo.

MINUTA BASE PARA DESENVOLVIMENTO

PROJETO DE LEI

Ementa: ${projeto.ementa ?? 'Dispoe sobre materia a ser detalhada conforme a finalidade do projeto.'}

Art. 1o Fica instituida, no ambito de ${gabinete?.orgao_casa_legislativa ?? 'ente competente'}, a disciplina relacionada ao tema objeto deste projeto, conforme a finalidade indicada na ementa.

Art. 2o Para os fins desta Lei, deverao ser observados os principios da legalidade, eficiencia, transparencia, interesse publico e adequacao a realidade local.

Art. 3o O Poder competente podera regulamentar esta Lei, quando necessario, respeitadas as competencias constitucionais e legais aplicaveis.

Art. 4o As despesas decorrentes da execucao desta Lei, quando houver, correrao por conta das dotacoes orcamentarias proprias, observada a legislacao fiscal vigente.

Art. 5o Esta Lei entra em vigor na data de sua publicacao.

OBSERVACAO

Este texto e uma primeira versao de trabalho. A justificativa deve ser gerada somente apos validacao da minuta.`;
}

function assertMinutaApproved(approved_minuta: boolean) {
  if (!approved_minuta) {
    throw new Error('Minuta precisa ser aprovada antes de gerar justificativa.');
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

Submetemos a apreciacao desta Casa Legislativa o presente projeto, intitulado "${titulo}", que tem por finalidade ${ementa ?? 'disciplinar materia de interesse publico conforme a minuta aprovada'}.

A proposta foi elaborada a partir de analise tecnica e comparativa de norma de referencia, respeitando a necessidade de adequacao a realidade institucional de ${orgaoCasaLegislativa ?? 'seu orgao legislativo'}.

Sob o aspecto administrativo, a medida busca conferir maior seguranca juridica, previsibilidade e organizacao normativa ao tema tratado, permitindo que a execucao da politica publica ocorra de forma compativel com os principios da legalidade, eficiencia, transparencia e interesse publico.

Quanto ao impacto orcamentario, quando houver necessidade de despesa publica, sua execucao devera observar as dotacoes orcamentarias proprias e a legislacao fiscal vigente.

Ressalta-se que a minuta foi submetida a validacao no fluxo interno do projeto antes da geracao desta justificativa, em observancia ao procedimento oficial do Amygo Legislativo.

Diante do exposto, contamos com o apoio dos nobres pares para a aprovacao da presente proposicao.

${gabineteNome ?? 'Gabinete responsavel'}`;
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
    return { error: 'Sessao expirada. Entre novamente para vincular a norma.' };
  }

  const [projeto, norma] = await Promise.all([
    supabase.from('projetos_legislativos').select('id').eq('id', projetoId).single(),
    supabase.from('biblioteca_normas').select('id').eq('id', normaId).single()
  ]);

  if (projeto.error || !projeto.data) {
    return { error: 'Projeto nao encontrado ou nao vinculado ao seu usuario.' };
  }

  if (norma.error || !norma.data) {
    return { error: 'Norma nao encontrada na sua biblioteca.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Nao foi possivel preparar o vinculo da norma.'
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
    return { error: `Nao foi possivel usar a norma como referencia: ${error.message}` };
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
    return { error: 'Projeto obrigatorio para gerar a analise.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessao expirada. Entre novamente para gerar a analise.' };
  }

  const projeto = await supabase
    .from('projetos_legislativos')
    .select('id, titulo, ementa, tipo, gabinete_id, workflow_status')
    .eq('id', projetoId)
    .single();

  if (projeto.error || !projeto.data) {
    return { error: 'Projeto nao encontrado ou nao vinculado ao seu usuario.' };
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
    return { error: `Nao foi possivel carregar as normas de referencia: ${referencias.error.message}` };
  }

  const normaIds = (referencias.data ?? []).map((referencia) => referencia.norma_id);

  if (normaIds.length === 0) {
    return { error: 'Marque uma norma da biblioteca como referencia antes de gerar a analise.' };
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
      error: error instanceof Error ? error.message : 'Nao foi possivel preparar a geracao da analise.'
    };
  }

  const latestVersion = await admin
    .from('projeto_versoes')
    .select('numero_versao')
    .eq('projeto_id', projetoId)
    .order('numero_versao', { ascending: false })
    .limit(1);

  if (latestVersion.error) {
    return { error: `Nao foi possivel calcular a proxima versao: ${latestVersion.error.message}` };
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
    resumo_alteracoes: 'Analise comparativa preliminar e minuta-base geradas a partir das normas de referencia.',
    criado_por: user.id,
    origem: 'ia'
  });

  if (error) {
    return { error: `Nao foi possivel salvar a analise comparativa: ${error.message}` };
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
      error: `Minuta salva, mas nao foi possivel atualizar o status do fluxo: ${workflowError.message}`
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
    message: `Analise comparativa e minuta geradas como versao ${nextVersion}.`
  });

  if (logError) {
    return { error: logError };
  }

  revalidatePath(`/projetos-legislativos/${projetoId}`);

  return { success: `Analise comparativa gerada como versao ${nextVersion}.` };
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
    return { error: 'Sessao expirada. Entre novamente para aprovar a minuta.' };
  }

  const projeto = await supabase
    .from('projetos_legislativos')
    .select('id, workflow_status')
    .eq('id', projetoId)
    .single();

  if (projeto.error || !projeto.data) {
    return { error: 'Projeto nao encontrado ou nao vinculado ao seu usuario.' };
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
      error: error instanceof Error ? error.message : 'Nao foi possivel preparar a aprovacao da minuta.'
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
    return { error: `Nao foi possivel aprovar a minuta: ${error.message}` };
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
    message: 'Minuta aprovada apos validacao.'
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
    return { error: 'Projeto obrigatorio para gerar justificativa.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessao expirada. Entre novamente para gerar justificativa.' };
  }

  const projeto = await supabase
    .from('projetos_legislativos')
    .select('id, titulo, ementa, gabinete_id, approved_minuta, workflow_status')
    .eq('id', projetoId)
    .single();

  if (projeto.error || !projeto.data) {
    return { error: 'Projeto nao encontrado ou nao vinculado ao seu usuario.' };
  }

  try {
    assertMinutaApproved(projeto.data.approved_minuta);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Minuta ainda nao aprovada.' };
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
    return { error: 'Nao ha minuta versionada para justificar.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Nao foi possivel preparar a geracao da justificativa.'
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
    return { error: `Nao foi possivel salvar a justificativa: ${versaoError.message}` };
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
      error: `Justificativa salva, mas nao foi possivel atualizar o status do fluxo: ${workflowError.message}`
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
    message: `Justificativa gerada como versao ${nextVersion}.`
  });

  if (logError) {
    return { error: logError };
  }

  revalidatePath(`/projetos-legislativos/${projetoId}`);

  return { success: `Justificativa gerada como versao ${nextVersion}.` };
}

export async function registerDocxExport(
  _prevState: RegisterDocxExportState | null,
  formData: FormData
): Promise<RegisterDocxExportState> {
  const startedAt = Date.now();
  const projetoId = String(formData.get('projeto_id') ?? '');

  if (!projetoId) {
    return { error: 'Projeto obrigatorio para registrar exportacao DOCX.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sessao expirada. Entre novamente para registrar exportacao DOCX.' };
  }

  const projeto = await supabase
    .from('projetos_legislativos')
    .select('id, workflow_status')
    .eq('id', projetoId)
    .single();

  if (projeto.error || !projeto.data) {
    return { error: 'Projeto nao encontrado ou nao vinculado ao seu usuario.' };
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Nao foi possivel preparar o registro da exportacao DOCX.'
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
      error: `DOCX exportado, mas nao foi possivel atualizar o status do fluxo: ${workflowError.message}`
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
    message: 'Exportacao DOCX registrada no pipeline oficial.'
  });

  if (logError) {
    return { error: logError };
  }

  revalidatePath(`/projetos-legislativos/${projetoId}`);

  return { success: 'Exportacao DOCX registrada no generation_logs.' };
}
