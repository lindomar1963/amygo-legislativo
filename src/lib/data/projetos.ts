import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type ProjetoDetalhe = Pick<
  Database['public']['Tables']['projetos_legislativos']['Row'],
  'titulo' | 'ementa' | 'tipo'
>;

type BibliotecaNorma = Pick<
  Database['public']['Tables']['biblioteca_normas']['Row'],
  | 'id'
  | 'titulo'
  | 'esfera'
  | 'uf'
  | 'municipio'
  | 'orgao_origem'
  | 'tipo'
  | 'numero'
  | 'ano'
  | 'tema'
  | 'ementa'
  | 'texto_integral'
  | 'fonte_url'
>;

const stopWords = new Set([
  'para',
  'sobre',
  'como',
  'pela',
  'pelo',
  'dos',
  'das',
  'com',
  'uma',
  'que',
  'estado',
  'amazonas',
  'projeto',
  'lei'
]);

function normalizeText(value: string) {
  return value.toLocaleLowerCase('pt-BR');
}

function extractTerms(projeto: ProjetoDetalhe) {
  return normalizeText([projeto.titulo, projeto.ementa, projeto.tipo].filter(Boolean).join(' '))
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 3 && !stopWords.has(term))
    .slice(0, 12);
}

function scoreNorma(norma: BibliotecaNorma, terms: string[]) {
  const title = normalizeText(norma.titulo);
  const tema = normalizeText(norma.tema ?? '');
  const ementa = normalizeText(norma.ementa ?? '');
  const texto = normalizeText(norma.texto_integral ?? '');

  return terms.reduce((score, term) => {
    if (title.includes(term)) return score + 5;
    if (tema.includes(term)) return score + 4;
    if (ementa.includes(term)) return score + 3;
    if (texto.includes(term)) return score + 1;
    return score;
  }, 0);
}

async function getProjetoWithWorkflow(id: string) {
  const supabase = await createClient();

  const projeto = await supabase
    .from('projetos_legislativos')
    .select(
      'id, titulo, ementa, status_fluxo, workflow_status, approved_minuta, tipo, gabinete_id, created_at, updated_at'
    )
    .eq('id', id)
    .single();

  if (!projeto.error) {
    return projeto;
  }

  const message = projeto.error.message.toLowerCase();

  if (!message.includes('workflow_status') && !message.includes('approved_minuta')) {
    return projeto;
  }

  const fallback = await supabase
    .from('projetos_legislativos')
    .select('id, titulo, ementa, status_fluxo, tipo, gabinete_id, created_at, updated_at')
    .eq('id', id)
    .single();

  return {
    data: fallback.data
      ? {
          ...fallback.data,
          workflow_status: 'draft' as const,
          approved_minuta: false
        }
      : null,
    error: fallback.error
  };
}

export async function getProjetos() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('projetos_legislativos')
    .select('id, titulo, ementa, status_fluxo, tipo, created_at, gabinete_id')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao listar projetos: ${error.message}`);
  }

  return data;
}

export async function getProjetoDetalhe(id: string) {
  const supabase = await createClient();

  const [projeto, versoes, comentarios] = await Promise.all([
    getProjetoWithWorkflow(id),
    supabase
      .from('projeto_versoes')
      .select('id, numero_versao, resumo_alteracoes, origem, created_at, criado_por')
      .eq('projeto_id', id)
      .order('numero_versao', { ascending: false }),
    supabase
      .from('comentarios_tecnicos')
      .select('id, tipo, comentario, resolvido, created_at, versao_id, autor_id')
      .eq('projeto_id', id)
      .order('created_at', { ascending: false })
  ]);

  const projetoData = projeto.data;

  if (projeto.error || !projetoData) {
    throw new Error(`Erro ao carregar projeto: ${projeto.error?.message ?? 'projeto nao encontrado'}`);
  }

  const gabinete = await supabase
    .from('gabinetes')
    .select('id, nome, esfera, orgao_casa_legislativa')
    .eq('id', projetoData.gabinete_id)
    .single();

  const [normas, referencias] = await Promise.all([
    supabase
      .from('biblioteca_normas')
      .select('id, titulo, esfera, uf, municipio, orgao_origem, tipo, numero, ano, tema, ementa, texto_integral, fonte_url')
      .limit(100),
    supabase
      .from('projeto_normas_referencias')
      .select('id, norma_id, created_at')
      .eq('projeto_id', id)
  ]);

  const terms = extractTerms(projetoData);
  const normasRelacionadas = (normas.data ?? [])
    .map((norma) => ({ ...norma, score: scoreNorma(norma, terms) }))
    .filter((norma) => norma.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    projeto: projetoData,
    gabinete: gabinete.data,
    normasRelacionadas,
    referencias: referencias.error ? [] : referencias.data ?? [],
    referenciasSetupError:
      referencias.error && referencias.error.message.includes('projeto_normas_referencias')
        ? referencias.error.message
        : null,
    versoes: versoes.data ?? [],
    comentarios: comentarios.data ?? []
  };
}
