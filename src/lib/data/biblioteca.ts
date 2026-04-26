import { createClient } from '@/lib/supabase/server';

export async function getBibliotecaNormas() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('biblioteca_normas')
    .select(
      'id, titulo, esfera, uf, municipio, orgao_origem, tipo, numero, ano, tema, ementa, fonte_url, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar normas da biblioteca: ${error.message}`);
  }

  return data;
}
