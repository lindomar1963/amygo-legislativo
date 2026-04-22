export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nome: string;
          email: string;
          papel_global: 'admin_plataforma' | 'suporte' | 'usuario';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          papel_global?: 'admin_plataforma' | 'suporte' | 'usuario';
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      gabinetes: {
        Row: {
          id: string;
          nome: string;
          esfera: 'municipal' | 'estadual' | 'federal';
          orgao_casa_legislativa: string;
          status: 'ativo' | 'inativo';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          nome: string;
          esfera: 'municipal' | 'estadual' | 'federal';
          orgao_casa_legislativa: string;
          status?: 'ativo' | 'inativo';
        };
        Update: Partial<Database['public']['Tables']['gabinetes']['Insert']>;
      };
      gabinetes_membros: {
        Row: {
          id: string;
          gabinete_id: string;
          user_id: string;
          papel_no_gabinete: 'chefe' | 'assessor' | 'revisor' | 'leitor';
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          gabinete_id: string;
          user_id: string;
          papel_no_gabinete: 'chefe' | 'assessor' | 'revisor' | 'leitor';
          ativo?: boolean;
        };
        Update: Partial<Database['public']['Tables']['gabinetes_membros']['Insert']>;
      };
      projetos_legislativos: {
        Row: {
          id: string;
          gabinete_id: string;
          titulo: string;
          ementa: string | null;
          status_fluxo: 'rascunho' | 'em_revisao' | 'aprovado_interno' | 'protocolado';
          tipo: 'PL' | 'PEC' | 'requerimento' | 'indicacao' | 'outro';
          autor_responsavel_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          gabinete_id: string;
          titulo: string;
          ementa?: string | null;
          status_fluxo?: 'rascunho' | 'em_revisao' | 'aprovado_interno' | 'protocolado';
          tipo?: 'PL' | 'PEC' | 'requerimento' | 'indicacao' | 'outro';
          autor_responsavel_id: string;
        };
        Update: Partial<Database['public']['Tables']['projetos_legislativos']['Insert']>;
      };
      projeto_versoes: {
        Row: {
          id: string;
          projeto_id: string;
          numero_versao: number;
          conteudo_texto: string;
          resumo_alteracoes: string;
          criado_por: string;
          origem: 'manual' | 'ia' | 'importacao';
          created_at: string;
        };
        Insert: {
          projeto_id: string;
          numero_versao: number;
          conteudo_texto: string;
          resumo_alteracoes: string;
          criado_por: string;
          origem?: 'manual' | 'ia' | 'importacao';
        };
        Update: Partial<Database['public']['Tables']['projeto_versoes']['Insert']>;
      };
      comentarios_tecnicos: {
        Row: {
          id: string;
          projeto_id: string;
          versao_id: string;
          autor_id: string;
          trecho_referencia: string | null;
          comentario: string;
          tipo: 'juridico' | 'redacional' | 'politico' | 'orcamentario';
          resolvido: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          projeto_id: string;
          versao_id: string;
          autor_id: string;
          trecho_referencia?: string | null;
          comentario: string;
          tipo: 'juridico' | 'redacional' | 'politico' | 'orcamentario';
          resolvido?: boolean;
        };
        Update: Partial<Database['public']['Tables']['comentarios_tecnicos']['Insert']>;
      };
      auditoria_eventos: {
        Row: {
          id: number;
          entidade: 'projeto' | 'versao' | 'comentario' | 'gabinete' | 'membro' | 'ia_interacao' | 'usuario';
          entidade_id: string;
          acao: 'create' | 'update' | 'delete' | 'status_change' | 'ia_generate';
          actor_user_id: string | null;
          payload_diff: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
      ia_interacoes: {
        Row: {
          id: string;
          projeto_id: string;
          versao_id: string | null;
          user_id: string;
          tipo_operacao: 'gerar_minuta' | 'revisar_texto' | 'sugerir_emenda' | 'sugerir_justificativa';
          prompt_resumo: string | null;
          resposta_resumo: string | null;
          tokens_input: number | null;
          tokens_output: number | null;
          custo_estimado: number | null;
          created_at: string;
        };
        Insert: {
          projeto_id: string;
          user_id: string;
          versao_id?: string | null;
          tipo_operacao: 'gerar_minuta' | 'revisar_texto' | 'sugerir_emenda' | 'sugerir_justificativa';
          prompt_resumo?: string | null;
          resposta_resumo?: string | null;
          tokens_input?: number | null;
          tokens_output?: number | null;
          custo_estimado?: number | null;
        };
        Update: Partial<Database['public']['Tables']['ia_interacoes']['Insert']>;
      };
    };
  };
};
