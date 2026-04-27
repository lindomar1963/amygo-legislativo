export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown> | never,
  Update extends Record<string, unknown> | never = Partial<Insert>
> = {
  Row: Row & Record<string, unknown>;
  Insert: Insert extends never ? never : Insert & Record<string, unknown>;
  Update: Update extends never ? never : Update & Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      users: Table<
        {
          id: string;
          nome: string;
          email: string;
          papel_global: 'admin_plataforma' | 'suporte' | 'usuario';
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          nome: string;
          email: string;
          papel_global?: 'admin_plataforma' | 'suporte' | 'usuario';
        }
      >;
      gabinetes: Table<
        {
          id: string;
          nome: string;
          esfera: 'municipal' | 'estadual' | 'federal';
          orgao_casa_legislativa: string;
          status: 'ativo' | 'inativo';
          created_at: string;
          updated_at: string;
        },
        {
          nome: string;
          esfera: 'municipal' | 'estadual' | 'federal';
          orgao_casa_legislativa: string;
          status?: 'ativo' | 'inativo';
        }
      >;
      gabinetes_membros: Table<
        {
          id: string;
          gabinete_id: string;
          user_id: string;
          papel_no_gabinete: 'chefe' | 'assessor' | 'revisor' | 'leitor';
          ativo: boolean;
          created_at: string;
        },
        {
          gabinete_id: string;
          user_id: string;
          papel_no_gabinete: 'chefe' | 'assessor' | 'revisor' | 'leitor';
          ativo?: boolean;
        }
      >;
      biblioteca_normas: Table<
        {
          id: string;
          owner_user_id: string;
          titulo: string;
          esfera: 'municipal' | 'estadual' | 'federal';
          uf: string | null;
          municipio: string | null;
          orgao_origem: string;
          tipo: 'lei' | 'lei_complementar' | 'decreto' | 'resolucao' | 'outro';
          numero: string | null;
          ano: number | null;
          tema: string | null;
          ementa: string | null;
          texto_integral: string | null;
          fonte_url: string | null;
          arquivo_url: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          owner_user_id: string;
          titulo: string;
          esfera: 'municipal' | 'estadual' | 'federal';
          uf?: string | null;
          municipio?: string | null;
          orgao_origem: string;
          tipo?: 'lei' | 'lei_complementar' | 'decreto' | 'resolucao' | 'outro';
          numero?: string | null;
          ano?: number | null;
          tema?: string | null;
          ementa?: string | null;
          texto_integral?: string | null;
          fonte_url?: string | null;
          arquivo_url?: string | null;
        }
      >;
      projetos_legislativos: Table<
        {
          id: string;
          gabinete_id: string;
          titulo: string;
          ementa: string | null;
          status_fluxo: 'rascunho' | 'em_revisao' | 'aprovado_interno' | 'protocolado';
          workflow_status:
            | 'draft'
            | 'analysis_generated'
            | 'minuta_generated'
            | 'minuta_approved'
            | 'justificativa_generated'
            | 'docx_exported';
          approved_minuta: boolean;
          tipo: 'PL' | 'PEC' | 'requerimento' | 'indicacao' | 'outro';
          autor_responsavel_id: string;
          created_at: string;
          updated_at: string;
        },
        {
          gabinete_id: string;
          titulo: string;
          ementa?: string | null;
          status_fluxo?: 'rascunho' | 'em_revisao' | 'aprovado_interno' | 'protocolado';
          workflow_status?:
            | 'draft'
            | 'analysis_generated'
            | 'minuta_generated'
            | 'minuta_approved'
            | 'justificativa_generated'
            | 'docx_exported';
          approved_minuta?: boolean;
          tipo?: 'PL' | 'PEC' | 'requerimento' | 'indicacao' | 'outro';
          autor_responsavel_id: string;
        }
      >;
      projeto_normas_referencias: Table<
        {
          id: string;
          projeto_id: string;
          norma_id: string;
          observacao: string | null;
          created_by: string;
          created_at: string;
        },
        {
          projeto_id: string;
          norma_id: string;
          observacao?: string | null;
          created_by: string;
        }
      >;
      projeto_versoes: Table<
        {
          id: string;
          projeto_id: string;
          numero_versao: number;
          conteudo_texto: string;
          resumo_alteracoes: string;
          criado_por: string;
          origem: 'manual' | 'ia' | 'importacao';
          created_at: string;
        },
        {
          projeto_id: string;
          numero_versao: number;
          conteudo_texto: string;
          resumo_alteracoes: string;
          criado_por: string;
          origem?: 'manual' | 'ia' | 'importacao';
        }
      >;
      comentarios_tecnicos: Table<
        {
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
        },
        {
          projeto_id: string;
          versao_id: string;
          autor_id: string;
          trecho_referencia?: string | null;
          comentario: string;
          tipo: 'juridico' | 'redacional' | 'politico' | 'orcamentario';
          resolvido?: boolean;
        }
      >;
      auditoria_eventos: Table<
        {
          id: number;
          entidade: 'projeto' | 'versao' | 'comentario' | 'gabinete' | 'membro' | 'ia_interacao' | 'usuario';
          entidade_id: string;
          acao: 'create' | 'update' | 'delete' | 'status_change' | 'ia_generate';
          actor_user_id: string | null;
          payload_diff: Json;
          created_at: string;
        },
        never,
        never
      >;
      generation_logs: Table<
        {
          id: string;
          project_id: string;
          stage: string;
          request_payload: Json;
          response_payload: Json;
          success: boolean;
          created_at: string;
        },
        {
          project_id: string;
          stage: string;
          request_payload?: Json;
          response_payload?: Json;
          success?: boolean;
        }
      >;
      ia_interacoes: Table<
        {
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
        },
        {
          projeto_id: string;
          user_id: string;
          versao_id?: string | null;
          tipo_operacao: 'gerar_minuta' | 'revisar_texto' | 'sugerir_emenda' | 'sugerir_justificativa';
          prompt_resumo?: string | null;
          resposta_resumo?: string | null;
          tokens_input?: number | null;
          tokens_output?: number | null;
          custo_estimado?: number | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
