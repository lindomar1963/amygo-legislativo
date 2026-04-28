import { createSimpleDocx, normalizeLegislativeText } from '@/lib/docx/simple-docx';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/users/ensure-user-profile';
import type { Database } from '@/types/database';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type WorkflowStatus = Database['public']['Tables']['projetos_legislativos']['Row']['workflow_status'];
type ProjetoVersao = Pick<
  Database['public']['Tables']['projeto_versoes']['Row'],
  'numero_versao' | 'conteudo_texto' | 'resumo_alteracoes'
>;

type DocxContent = {
  titulo: string;
  ementa: string;
  minuta: string;
  justificativa: string;
  autor: string;
  cargoAutor: string;
  localData: string;
  casaLegislativa: string;
};

function sanitizeFilename(value: string) {
  return value
    .normalize('NFC')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);
}

function extractMinuta(content: string) {
  const marker = 'MINUTA BASE PARA DESENVOLVIMENTO';
  const index = content.indexOf(marker);

  if (index === -1) return content;

  return content.slice(index + marker.length).trim();
}

function findSection(lines: string[], startMarker: string, endMarker: string) {
  const start = lines.findIndex((line) => line.trim().toUpperCase() === startMarker);
  const end = lines.findIndex((line, index) => index > start && line.trim().toUpperCase() === endMarker);

  if (start === -1 || end === -1) return '';

  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim();
}

function parseExportedVersion(version: ProjetoVersao, fallbackTitle: string): DocxContent {
  const lines = normalizeLegislativeText(version.conteudo_texto).split(/\r?\n/);
  const nonEmptyLines = lines.map((line) => line.trim()).filter(Boolean);
  const titleIndex = nonEmptyLines.findIndex((line) => line.toUpperCase().startsWith('PROJETO DE LEI'));
  const titulo = nonEmptyLines[titleIndex + 1] ?? fallbackTitle;
  const ementa = findSection(lines, 'EMENTA', 'ARTICULADO DA MINUTA') || 'Sem ementa cadastrada.';
  const minuta = findSection(lines, 'ARTICULADO DA MINUTA', 'JUSTIFICATIVA');
  const justificativaStart = lines.findIndex((line) => line.trim().toUpperCase() === 'JUSTIFICATIVA');
  const afterJustificativa = justificativaStart === -1 ? [] : lines.slice(justificativaStart + 1);
  const dateLineIndex = afterJustificativa.findIndex((line) => /,\s+em\s+.+\.$/i.test(line.trim()));
  const justificativa =
    dateLineIndex === -1
      ? afterJustificativa.join('\n').trim()
      : afterJustificativa.slice(0, dateLineIndex).join('\n').trim();
  const dateLine = dateLineIndex === -1 ? '' : afterJustificativa[dateLineIndex].trim();
  const signatureLines =
    dateLineIndex === -1 ? [] : afterJustificativa.slice(dateLineIndex + 1).map((line) => line.trim()).filter(Boolean);

  return {
    titulo,
    ementa,
    minuta,
    justificativa,
    casaLegislativa: dateLine.replace(/,\s+em\s+.+\.$/i, '') || 'Casa Legislativa',
    localData: dateLine.match(/,\s+em\s+(.+)\.$/i)?.[1] ?? '',
    autor: signatureLines[0] ?? 'Autor',
    cargoAutor: signatureLines[1] ?? 'Parlamentar'
  };
}

function buildFreshDocxContent({
  projeto,
  gabinete,
  minuta,
  justificativa,
  userEmail
}: {
  projeto: { titulo: string; ementa: string | null };
  gabinete: { nome: string; esfera: string; orgao_casa_legislativa: string } | null;
  minuta: ProjetoVersao;
  justificativa: ProjetoVersao;
  userEmail: string | undefined;
}): DocxContent {
  return {
    titulo: normalizeLegislativeText(projeto.titulo),
    ementa: normalizeLegislativeText(projeto.ementa ?? 'Sem ementa cadastrada.'),
    minuta: normalizeLegislativeText(extractMinuta(minuta.conteudo_texto)),
    justificativa: normalizeLegislativeText(justificativa.conteudo_texto.replace(/^JUSTIFICATIVA\s*/i, '').trim()),
    casaLegislativa: normalizeLegislativeText(gabinete?.orgao_casa_legislativa ?? 'Casa Legislativa'),
    autor: normalizeLegislativeText(gabinete?.nome ?? userEmail ?? 'Autor'),
    cargoAutor:
      gabinete?.esfera === 'estadual' ? 'Deputado Estadual' : gabinete?.esfera === 'municipal' ? 'Vereador' : 'Parlamentar',
    localData: new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Manaus'
    }).format(new Date())
  };
}

function buildExportText(content: DocxContent) {
  return [
    'PROJETO DE LEI Nº ____ / ______',
    '',
    content.titulo,
    '',
    'EMENTA',
    content.ementa,
    '',
    'ARTICULADO DA MINUTA',
    content.minuta,
    '',
    'JUSTIFICATIVA',
    content.justificativa,
    '',
    `${content.casaLegislativa.toUpperCase()}, em ${content.localData}.`,
    '',
    content.autor,
    content.cargoAutor
  ].join('\n');
}

function buildDocxResponse(content: DocxContent) {
  const docx = createSimpleDocx(content);
  const filename = `${sanitizeFilename(content.titulo) || 'projeto-legislativo'}.docx`;
  const encodedFilename = encodeURIComponent(filename);

  return new Response(new Uint8Array(docx), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8',
      'Content-Disposition': `attachment; filename="projeto-legislativo.docx"; filename*=UTF-8''${encodedFilename}`,
      'Cache-Control': 'no-store'
    }
  });
}

async function logDocxExport({
  admin,
  projectId,
  userId,
  startedAt,
  operation,
  fromStatus,
  toStatus,
  versionNumber
}: {
  admin: ReturnType<typeof createAdminClient>;
  projectId: string;
  userId: string;
  startedAt: number;
  operation: 'export_docx' | 'redownload_docx';
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  versionNumber: number;
}) {
  return admin.from('generation_logs').insert({
    project_id: projectId,
    stage: 'docx_exported',
    request_payload: {
      project_id: projectId,
      actor_user_id: userId,
      file_type: 'docx',
      operation
    },
    response_payload: {
      operation,
      status: 'success',
      execution_time: Date.now() - startedAt,
      model_used: null,
      project_id: projectId,
      workflow_status_from: fromStatus,
      workflow_status_to: toStatus,
      version_number: versionNumber
    },
    success: true
  });
}

export async function GET(request: Request, { params }: RouteContext) {
  const startedAt = Date.now();
  const { id } = await params;
  const mode = new URL(request.url).searchParams.get('mode') === 'download' ? 'download' : 'new';
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response('Sessão expirada. Entre novamente para exportar DOCX.', { status: 401 });
  }

  const projeto = await supabase
    .from('projetos_legislativos')
    .select('id, titulo, ementa, workflow_status, gabinete_id')
    .eq('id', id)
    .single();

  if (projeto.error || !projeto.data) {
    return new Response('Projeto não encontrado ou não vinculado ao seu usuário.', { status: 404 });
  }

  const canCreateNew = projeto.data.workflow_status === 'justificativa_generated' || projeto.data.workflow_status === 'docx_exported';
  const canDownloadExisting = projeto.data.workflow_status === 'docx_exported';

  if (mode === 'new' && !canCreateNew) {
    return new Response('Gere a justificativa antes de exportar DOCX.', { status: 400 });
  }

  if (mode === 'download' && !canDownloadExisting) {
    return new Response('Ainda não existe DOCX exportado para baixar novamente.', { status: 400 });
  }

  const [versoes, gabinete] = await Promise.all([
    supabase
      .from('projeto_versoes')
      .select('numero_versao, conteudo_texto, resumo_alteracoes')
      .eq('projeto_id', id)
      .order('numero_versao', { ascending: false }),
    supabase.from('gabinetes').select('nome, esfera, orgao_casa_legislativa').eq('id', projeto.data.gabinete_id).single()
  ]);

  if (versoes.error) {
    return new Response(`Não foi possível carregar as versões: ${versoes.error.message}`, { status: 500 });
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Não foi possível preparar a exportação DOCX.', {
      status: 500
    });
  }

  const allVersions = versoes.data ?? [];
  const fromStatus = projeto.data.workflow_status as WorkflowStatus;
  const toStatus: WorkflowStatus = 'docx_exported';

  if (mode === 'download') {
    const exportedVersion = allVersions.find((version) => version.resumo_alteracoes.toLowerCase().includes('docx'));

    if (!exportedVersion) {
      return new Response('Nenhuma versão DOCX exportada foi encontrada no histórico.', { status: 404 });
    }

    const content = parseExportedVersion(exportedVersion, projeto.data.titulo);
    const { error: logError } = await logDocxExport({
      admin,
      projectId: id,
      userId: user.id,
      startedAt,
      operation: 'redownload_docx',
      fromStatus,
      toStatus,
      versionNumber: exportedVersion.numero_versao
    });

    if (logError) {
      return new Response(`DOCX preparado, mas não foi possível registrar o log: ${logError.message}`, { status: 500 });
    }

    return buildDocxResponse(content);
  }

  const minuta = allVersions.find((versao) => versao.conteudo_texto.includes('MINUTA BASE PARA DESENVOLVIMENTO'));
  const justificativa = allVersions.find(
    (versao) =>
      versao.conteudo_texto.trim().startsWith('JUSTIFICATIVA') ||
      versao.resumo_alteracoes.toLowerCase().includes('justificativa')
  );

  if (!minuta || !justificativa) {
    return new Response('Minuta e justificativa precisam existir antes da exportação DOCX.', { status: 400 });
  }

  const latestVersionNumber = allVersions[0]?.numero_versao ?? 0;
  const nextVersion = latestVersionNumber + 1;
  const content = buildFreshDocxContent({
    projeto: projeto.data,
    gabinete: gabinete.data ?? null,
    minuta,
    justificativa,
    userEmail: user.email
  });

  const { error: versionError } = await admin.from('projeto_versoes').insert({
    projeto_id: id,
    numero_versao: nextVersion,
    conteudo_texto: buildExportText(content),
    resumo_alteracoes: 'Versão consolidada exportada em DOCX.',
    criado_por: user.id,
    origem: 'manual'
  });

  if (versionError) {
    return new Response(`Não foi possível salvar a versão exportada: ${versionError.message}`, { status: 500 });
  }

  const { error: workflowError } = await admin
    .from('projetos_legislativos')
    .update({ workflow_status: toStatus })
    .eq('id', id);

  if (workflowError) {
    return new Response(`DOCX criado, mas não foi possível atualizar o status: ${workflowError.message}`, {
      status: 500
    });
  }

  const { error: logError } = await logDocxExport({
    admin,
    projectId: id,
    userId: user.id,
    startedAt,
    operation: 'export_docx',
    fromStatus,
    toStatus,
    versionNumber: nextVersion
  });

  if (logError) {
    return new Response(`DOCX criado, mas não foi possível registrar o log: ${logError.message}`, { status: 500 });
  }

  return buildDocxResponse(content);
}
