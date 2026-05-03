import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type Gabinete = Database['public']['Tables']['gabinetes']['Row'];
type GabineteLicenca = Database['public']['Tables']['gabinete_licencas']['Row'];
type GabineteMembro = Database['public']['Tables']['gabinetes_membros']['Row'];
type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'id' | 'nome' | 'email' | 'papel_global'>;

export type EquipeMembro = GabineteMembro & {
  usuario: UserProfile | null;
};

export type GabineteEquipeLicenca = {
  gabinete: Gabinete;
  licenca: Pick<GabineteLicenca, 'plano' | 'limite_usuarios' | 'limite_projetos_mes' | 'status'>;
  licencaConfigurada: boolean;
  membros: EquipeMembro[];
  projetosCriadosNoMes: number;
  papelDoUsuario: GabineteMembro['papel_no_gabinete'] | null;
  podeGerenciarEquipe: boolean;
};

export type EquipeLicencaData = {
  setupPendente: boolean;
  gabinetes: GabineteEquipeLicenca[];
};

const defaultLicenca: GabineteEquipeLicenca['licenca'] = {
  plano: 'essencial',
  limite_usuarios: 6,
  limite_projetos_mes: 30,
  status: 'ativo'
};

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === '42P01' ||
        error.message?.includes('gabinete_licencas') ||
        error.message?.includes('schema cache'))
  );
}

function getMonthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getEquipeLicencaData(): Promise<EquipeLicencaData> {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { setupPendente: false, gabinetes: [] };
  }

  const { data: gabinetes, error: gabinetesError } = await supabase
    .from('gabinetes')
    .select('*')
    .order('created_at', { ascending: false });

  if (gabinetesError) {
    throw new Error(`Erro ao buscar gabinetes: ${gabinetesError.message}`);
  }

  const admin = createAdminClient();
  let setupPendente = false;

  const gabinetesComEquipe = await Promise.all(
    (gabinetes ?? []).map(async (gabinete) => {
      const [licencaResult, membrosResult, projetosResult] = await Promise.all([
        supabase.from('gabinete_licencas').select('*').eq('gabinete_id', gabinete.id).maybeSingle(),
        admin
          .from('gabinetes_membros')
          .select('id, gabinete_id, user_id, papel_no_gabinete, ativo, created_at')
          .eq('gabinete_id', gabinete.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('projetos_legislativos')
          .select('id', { count: 'exact', head: true })
          .eq('gabinete_id', gabinete.id)
          .gte('created_at', getMonthStartIso())
      ]);

      let licenca = defaultLicenca;
      let licencaConfigurada = false;

      if (licencaResult.error && isMissingTableError(licencaResult.error)) {
        setupPendente = true;
      } else if (licencaResult.error) {
        throw new Error(`Erro ao buscar licença do gabinete: ${licencaResult.error.message}`);
      } else if (licencaResult.data) {
        licenca = {
          plano: licencaResult.data.plano,
          limite_usuarios: licencaResult.data.limite_usuarios,
          limite_projetos_mes: licencaResult.data.limite_projetos_mes,
          status: licencaResult.data.status
        };
        licencaConfigurada = true;
      }

      if (membrosResult.error) {
        throw new Error(`Erro ao buscar equipe do gabinete: ${membrosResult.error.message}`);
      }

      const membros = membrosResult.data ?? [];
      const userIds = membros.map((membro) => membro.user_id);
      const { data: usuarios, error: usuariosError } = userIds.length
        ? await admin.from('users').select('id, nome, email, papel_global').in('id', userIds)
        : { data: [], error: null };

      if (usuariosError) {
        throw new Error(`Erro ao buscar usuários da equipe: ${usuariosError.message}`);
      }

      const usuariosPorId = new Map((usuarios ?? []).map((usuario) => [usuario.id, usuario]));
      const papelDoUsuario = membros.find((membro) => membro.user_id === user.id && membro.ativo)?.papel_no_gabinete ?? null;
      const podeGerenciarEquipe = papelDoUsuario === 'chefe';

      return {
        gabinete,
        licenca,
        licencaConfigurada,
        membros: membros.map((membro) => ({
          ...membro,
          usuario: usuariosPorId.get(membro.user_id) ?? null
        })),
        projetosCriadosNoMes: projetosResult.count ?? 0,
        papelDoUsuario,
        podeGerenciarEquipe
      };
    })
  );

  return {
    setupPendente,
    gabinetes: gabinetesComEquipe
  };
}
