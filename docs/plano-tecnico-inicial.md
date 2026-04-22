# Plano Técnico Inicial — Amygo Legislativo

Este documento descreve uma estratégia de implementação por etapas para a plataforma **Amygo Legislativo**, considerando que o produto será construído com **Supabase** (backend, banco, autenticação, storage, realtime) e **OpenAI API** (assistência técnica de redação legislativa).

## 1) Visão geral do produto

### Objetivo
Construir uma plataforma web para apoiar a produção técnica de projetos legislativos, com:

- cadastro de usuários
- cadastro de gabinetes
- criação de projetos legislativos
- versionamento de textos
- comentários técnicos internos
- histórico de alterações
- auditoria institucional
- integração com IA

### Princípios de arquitetura

- **Segurança por padrão**: Row Level Security (RLS) em todas as tabelas sensíveis.
- **Rastreabilidade completa**: qualquer alteração relevante deve gerar evento auditável.
- **Evolução incremental**: entrega por módulos com valor real desde o MVP.
- **UX para iniciantes**: fluxo guiado e linguagem clara para usuários sem perfil técnico.

---

## 2) Stack sugerida

### Frontend
- **Next.js (App Router) + TypeScript**
- UI: Tailwind CSS + biblioteca de componentes (ex.: shadcn/ui)
- Estado: React Query para chamadas e cache

### Backend e dados
- **Supabase**
  - PostgreSQL
  - Supabase Auth
  - Row Level Security
  - Storage (anexos, se necessário)
  - Realtime (comentários e colaboração ao vivo, etapa posterior)

### IA
- **OpenAI API**
  - geração inicial de minuta
  - revisão técnica (clareza, consistência normativa, estilo)
  - sugestões de emendas e justificativas

### Observabilidade e qualidade
- Logs estruturados
- Monitoramento de erro (ex.: Sentry)
- Testes automáticos (unitário, integração, e2e)

---

## 3) Modelo inicial de domínio

## Entidades principais

1. **users** (perfil de usuário)
   - id (uuid, referência ao auth.users)
   - nome
   - email
   - papel_global (admin_plataforma, suporte, etc.)
   - created_at / updated_at

2. **gabinetes**
   - id
   - nome
   - esfera (municipal, estadual, federal)
   - órgão/casa legislativa
   - status
   - created_at / updated_at

3. **gabinete_membros**
   - id
   - gabinete_id
   - user_id
   - papel_no_gabinete (chefe, assessor, revisor, leitor)
   - ativo
   - created_at

4. **projetos_legislativos**
   - id
   - gabinete_id
   - titulo
   - ementa
   - status_fluxo (rascunho, em_revisao, aprovado_interno, protocolado)
   - tipo (PL, PEC, requerimento, indicação etc.)
   - autor_responsavel_id
   - created_at / updated_at

5. **projeto_versoes**
   - id
   - projeto_id
   - numero_versao
   - conteudo_texto (markdown ou rich text serializado)
   - resumo_alteracoes
   - criado_por
   - origem (manual, ia, importacao)
   - created_at

6. **comentarios_tecnicos**
   - id
   - projeto_id
   - versao_id
   - autor_id
   - trecho_referencia (opcional)
   - comentario
   - tipo (juridico, redacional, politico, orcamentario)
   - resolvido (bool)
   - created_at / updated_at

7. **auditoria_eventos**
   - id
   - entidade (projeto, versao, comentario, gabinete, membro)
   - entidade_id
   - acao (create, update, delete, status_change, ia_generate)
   - actor_user_id
   - payload_diff (jsonb)
   - created_at

8. **ia_interacoes**
   - id
   - projeto_id
   - versao_id (opcional)
   - user_id
   - tipo_operacao (gerar_minuta, revisar_texto, sugerir_emenda)
   - prompt_resumo
   - resposta_resumo
   - tokens_input / tokens_output
   - custo_estimado
   - created_at

---

## 4) Etapas de implementação (roadmap)

## Etapa 0 — Fundação do projeto (1 semana)

**Objetivo:** iniciar base técnica consistente.

**Entregas:**
- Repositório com monorepo simples ou app único Next.js
- Configuração inicial de ambientes (`dev`, `staging`, `prod`)
- Supabase projeto criado + variáveis de ambiente
- Pipeline de lint, typecheck e build
- Estrutura de pastas e convenções de código

**Critério de pronto:**
- App sobe localmente e em preview
- Conexão com Supabase funcionando

---

## Etapa 1 — Autenticação e usuários (1–2 semanas)

**Objetivo:** permitir acesso seguro por usuário autenticado.

**Entregas:**
- Login/logout com Supabase Auth
- Tela de perfil do usuário
- Onboarding mínimo após primeiro login
- Tabela `users` sincronizada com `auth.users`
- Políticas RLS básicas por usuário autenticado

**Critério de pronto:**
- Usuário autentica e acessa área privada
- Dados de perfil persistidos com segurança

---

## Etapa 2 — Gabinetes e permissões (1–2 semanas)

**Objetivo:** estruturar contexto institucional e perfis de acesso.

**Entregas:**
- CRUD de gabinetes
- Convite/adicionar membros ao gabinete
- Controle de papéis no gabinete (RBAC)
- RLS por `gabinete_id`
- Telas de gestão de equipe

**Critério de pronto:**
- Usuário só enxerga dados dos gabinetes onde participa
- Perfis (chefe, assessor, leitor) com permissões distintas

---

## Etapa 3 — Projetos legislativos (MVP funcional) (2 semanas)

**Objetivo:** criar e organizar projetos legislativos.

**Entregas:**
- CRUD de projetos legislativos
- Campos essenciais (título, ementa, tipo, status)
- Listagem com filtros por status/autor/data
- Página de detalhes do projeto

**Critério de pronto:**
- Equipe consegue criar e acompanhar projetos do início ao rascunho

---

## Etapa 4 — Versionamento de textos (2 semanas)

**Objetivo:** garantir histórico técnico do conteúdo normativo.

**Entregas:**
- Criação de versão inicial e versões subsequentes
- Numeração automática de versões
- Comparação entre versões (diff textual)
- Campo de “resumo de alterações” obrigatório

**Critério de pronto:**
- Qualquer revisão gera nova versão auditável
- Possível consultar versões anteriores com clareza

---

## Etapa 5 — Comentários técnicos internos (1–2 semanas)

**Objetivo:** permitir revisão colaborativa com rastreabilidade.

**Entregas:**
- Comentários por versão e por trecho
- Status de comentário (aberto/resolvido)
- Filtros por tipo técnico
- Notificações internas básicas (in-app)

**Critério de pronto:**
- Time revisa texto por camadas técnicas sem perder contexto

---

## Etapa 6 — Histórico e auditoria institucional (2 semanas)

**Objetivo:** formalizar trilha de governança e conformidade.

**Entregas:**
- Tabela de eventos de auditoria (`auditoria_eventos`)
- Captura automática de eventos críticos via triggers/functions
- Tela de timeline institucional por projeto
- Exportação simples de histórico (CSV/PDF em fase posterior)

**Critério de pronto:**
- Toda ação relevante fica registrada com autor, data e alteração

---

## Etapa 7 — Integração com IA (2–3 semanas)

**Objetivo:** acelerar redação e revisão técnica com segurança.

**Entregas:**
- Ações de IA:
  - gerar minuta a partir de briefing
  - revisar linguagem técnica
  - sugerir justificativa
  - sugerir emendas por objetivo
- Registro das interações (`ia_interacoes`)
- Botão de “aceitar sugestão como nova versão”
- Limites de uso por perfil/gabinete

**Critério de pronto:**
- IA gera valor prático sem quebrar rastreabilidade
- Sugestões sempre passam por validação humana

---

## Etapa 8 — Segurança, LGPD e hardening (contínua, com foco final de release)

**Objetivo:** reduzir riscos jurídicos e operacionais.

**Entregas:**
- Revisão completa de RLS e permissões
- Criptografia e mascaramento de dados sensíveis quando aplicável
- Política de retenção e descarte de dados
- Termos de uso e política de privacidade
- Backup e plano de recuperação

**Critério de pronto:**
- Checklist de segurança aprovado para produção

---

## Etapa 9 — Testes, treinamento e go-live (1–2 semanas)

**Objetivo:** entrar em produção com previsibilidade.

**Entregas:**
- Testes e2e dos fluxos críticos
- Testes de carga básica
- Manual do usuário (foco em iniciantes)
- Treinamento de equipe piloto
- Deploy em produção e monitoramento assistido

**Critério de pronto:**
- Primeiros gabinetes operando com suporte e métricas

---

## 5) Backlog do MVP (ordem recomendada)

1. Login e perfil
2. Cadastro de gabinete
3. Membros e permissões
4. Criar projeto legislativo
5. Editor de texto + salvar versão
6. Histórico de versões
7. Comentários técnicos
8. Timeline de auditoria
9. IA: gerar minuta e revisão

---

## 6) Métricas de sucesso iniciais

- Tempo médio para produzir 1ª minuta (redução %)
- Número de revisões por projeto
- Taxa de comentários resolvidos
- Adoção de IA (% de projetos com uso assistido)
- Incidentes de permissão/acesso indevido (meta: zero)
- Satisfação dos assessores (NPS interno)

---

## 7) Riscos e mitigação

1. **Risco:** complexidade de permissões por gabinete.
   - **Mitigação:** começar com RBAC simples e evoluir para regras finas.

2. **Risco:** uso excessivo de IA sem revisão humana.
   - **Mitigação:** exigir ação explícita de aprovação para virar versão oficial.

3. **Risco:** crescimento de custo de API de IA.
   - **Mitigação:** limites por gabinete, cache de prompts e monitoramento de tokens.

4. **Risco:** resistência de usuários não técnicos.
   - **Mitigação:** UX guiada, tutorial curto e linguagem sem jargão.

---

## 8) Próximos passos práticos (primeiros 7 dias)

1. Criar projeto Supabase e projeto Next.js.
2. Definir esquema SQL inicial (users, gabinetes, membros, projetos, versões).
3. Implementar autenticação e layout base da área logada.
4. Publicar primeiro ambiente de preview.
5. Validar com 2–3 usuários reais do fluxo legislativo.

Com isso, você terá um **MVP inicial em construção com base sólida**, sem pular etapas críticas de segurança e rastreabilidade.
