import { createClient } from '@/lib/supabase/server';

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
    supabase
      .from('projetos_legislativos')
      .select('id, titulo, ementa, status_fluxo, tipo, gabinete_id, created_at, updated_at')
      .eq('id', id)
      .single(),
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

  if (projeto.error) {
    throw new Error(`Erro ao carregar projeto: ${projeto.error.message}`);
  }

  const gabinete = await supabase
    .from('gabinetes')
    .select('id, nome, esfera, orgao_casa_legislativa')
    .eq('id', projeto.data.gabinete_id)
    .single();

  return {
    projeto: projeto.data,
    gabinete: gabinete.data,
    versoes: versoes.data ?? [],
    comentarios: comentarios.data ?? []
  };
}
