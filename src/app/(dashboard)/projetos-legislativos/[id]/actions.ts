'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/users/ensure-user-profile';

export type AddProjetoReferenciaState = {
  success?: string;
  error?: string;
};

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
