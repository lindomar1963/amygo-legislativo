import { createSimpleDocx } from '@/lib/docx/simple-docx';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/users/ensure-user-profile';
import type { Database } from '@/types/database';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type WorkflowStatus = Database['public']['Tables']['projetos_legislativos']['Row']['workflow_status'];

function sanitizeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
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

export async function GET(_request: Request, { params }: RouteContext) {
  const startedAt = Date.now();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response('Sessao expirada. Entre novamente para exportar DOCX.', { status: 401 });
  }

  const projeto = await supabase
    .from('projetos_legislativos')
    .select('id, titulo, ementa, workflow_status, gabinete_id')
    .eq('id', id)
    .single();

  if (projeto.error || !projeto.data) {
    return new Response('Projeto nao encontrado ou nao vinculado ao seu usuario.', { status: 404 });
  }

  if (projeto.data.workflow_status !== 'justificativa_generated') {
    return new Response('Gere a justificativa antes de exportar DOCX.', { status: 400 });
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
    return new Response(`Nao foi possivel carregar as versoes: ${versoes.error.message}`, { status: 500 });
  }

  const minuta = (versoes.data ?? []).find((versao) => versao.conteudo_texto.includes('MINUTA BASE PARA DESENVOLVIMENTO'));
  const justificativa = (versoes.data ?? []).find(
    (versao) =>
      versao.conteudo_texto.trim().startsWith('JUSTIFICATIVA') ||
      versao.resumo_alteracoes.toLowerCase().includes('justificativa')
  );

  if (!minuta || !justificativa) {
    return new Response('Minuta e justificativa precisam existir antes da exportacao DOCX.', { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
    await ensureUserProfile(admin, user);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Nao foi possivel preparar a exportacao DOCX.', {
      status: 500
    });
  }

  const latestVersionNumber = (versoes.data ?? [])[0]?.numero_versao ?? 0;
  const nextVersion = latestVersionNumber + 1;
  const minutaText = extractMinuta(minuta.conteudo_texto);
  const justificativaText = justificativa.conteudo_texto.replace(/^JUSTIFICATIVA\s*/i, '').trim();
  const casaLegislativa = gabinete.data?.orgao_casa_legislativa ?? 'Casa Legislativa';
  const autor = gabinete.data?.nome ?? user.email ?? 'Autor';
  const cargoAutor =
    gabinete.data?.esfera === 'estadual'
      ? 'Deputado Estadual'
      : gabinete.data?.esfera === 'municipal'
        ? 'Vereador'
        : 'Parlamentar';
  const localData = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Manaus'
  }).format(new Date());
  const exportText = [
    'PROJETO DE LEI No ____ / ______',
    '',
    projeto.data.titulo,
    '',
    'EMENTA',
    projeto.data.ementa ?? 'Sem ementa cadastrada.',
    '',
    'ARTICULADO DA MINUTA',
    minutaText,
    '',
    'JUSTIFICATIVA',
    justificativaText,
    '',
    `${casaLegislativa.toUpperCase()}, em ${localData}.`,
    '',
    autor,
    cargoAutor
  ].join('\n');

  const { error: versionError } = await admin.from('projeto_versoes').insert({
    projeto_id: id,
    numero_versao: nextVersion,
    conteudo_texto: exportText,
    resumo_alteracoes: 'Versao exportada em DOCX.',
    criado_por: user.id,
    origem: 'manual'
  });

  if (versionError) {
    return new Response(`Nao foi possivel salvar a versao exportada: ${versionError.message}`, { status: 500 });
  }

  const fromStatus = projeto.data.workflow_status as WorkflowStatus;
  const toStatus: WorkflowStatus = 'docx_exported';
  const { error: workflowError } = await admin
    .from('projetos_legislativos')
    .update({ workflow_status: toStatus })
    .eq('id', id);

  if (workflowError) {
    return new Response(`DOCX criado, mas nao foi possivel atualizar o status: ${workflowError.message}`, {
      status: 500
    });
  }

  const { error: logError } = await admin.from('generation_logs').insert({
    project_id: id,
    stage: 'docx_exported',
    request_payload: {
      project_id: id,
      actor_user_id: user.id,
      file_type: 'docx'
    },
    response_payload: {
      operation: 'export_docx',
      status: 'success',
      execution_time: Date.now() - startedAt,
      model_used: null,
      project_id: id,
      workflow_status_from: fromStatus,
      workflow_status_to: toStatus,
      version_number: nextVersion
    },
    success: true
  });

  if (logError) {
    return new Response(`DOCX criado, mas nao foi possivel registrar o log: ${logError.message}`, { status: 500 });
  }

  const docx = createSimpleDocx({
    titulo: projeto.data.titulo,
    ementa: projeto.data.ementa,
    minuta: minutaText,
    justificativa: justificativaText,
    autor,
    cargoAutor,
    localData,
    casaLegislativa
  });
  const filename = `${sanitizeFilename(projeto.data.titulo) || 'projeto-legislativo'}.docx`;

  return new Response(new Uint8Array(docx), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
}
