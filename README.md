# Amygo Legislativo Web

Estrutura inicial de aplicação web em **Next.js + TypeScript + Supabase** para o sistema Amygo Legislativo.

## Stack

- Next.js (App Router)
- React 19
- TypeScript (strict)
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`)
- Zod para validação de variáveis de ambiente

## Módulos implementados

- Configuração de cliente Supabase (browser/server/middleware)
- Fluxo de autenticação (login/logout + proteção de rotas)
- Dashboard inicial com indicadores
- Gestão de gabinetes
- Listagem de projetos legislativos
- Página de detalhe do projeto
- Módulo de histórico de versões
- Módulo de comentários técnicos

## Estrutura

```txt
src/
  app/
    (auth)/login
    (dashboard)/dashboard
    (dashboard)/gabinetes
    (dashboard)/projetos-legislativos/[id]
  components/
    auth/
    layout/
    gabinetes/
    projetos/
    versionamento/
    comentarios/
  lib/
    data/
    supabase/
  types/
```

## Configuração

1. Copie `.env.example` para `.env.local`.
2. Preencha as credenciais do projeto Supabase já provisionado.
3. Instale dependências e rode localmente:

```bash
npm install
npm run dev
```

## Próximos passos recomendados

- Conectar formulários de criação/edição com server actions.
- Adicionar paginação/filtros avançados.
- Incluir testes e2e para fluxos críticos.
- Integrar módulo de auditoria e IA.
