import { createClient } from '@/lib/supabase/server';

export async function getDashboardSummary() {
  const supabase = await createClient();

  const [gabinetes, projetos, comentariosPendentes] = await Promise.all([
    supabase.from('gabinetes').select('id', { count: 'exact', head: true }),
    supabase.from('projetos_legislativos').select('id', { count: 'exact', head: true }),
    supabase.from('comentarios_tecnicos').select('id', { count: 'exact', head: true }).eq('resolvido', false)
  ]);

  return {
    totalGabinetes: gabinetes.count ?? 0,
    totalProjetos: projetos.count ?? 0,
    comentariosAbertos: comentariosPendentes.count ?? 0
  };
}
