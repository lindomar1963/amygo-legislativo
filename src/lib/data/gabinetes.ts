import { createClient } from '@/lib/supabase/server';

export async function getGabinetes() {
  const supabase = await createClient();

  const { data, error } = await supabase.from('gabinetes').select('*').order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar gabinetes: ${error.message}`);
  }

  return data;
}
