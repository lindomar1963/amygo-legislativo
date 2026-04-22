-- Amygo Legislativo - Initial Supabase schema
-- Source: docs/plano-tecnico-inicial.md

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.papel_global as enum ('admin_plataforma', 'suporte', 'usuario');
create type public.esfera_legislativa as enum ('municipal', 'estadual', 'federal');
create type public.status_gabinete as enum ('ativo', 'inativo');
create type public.papel_no_gabinete as enum ('chefe', 'assessor', 'revisor', 'leitor');
create type public.status_fluxo_projeto as enum ('rascunho', 'em_revisao', 'aprovado_interno', 'protocolado');
create type public.tipo_projeto_legislativo as enum ('PL', 'PEC', 'requerimento', 'indicacao', 'outro');
create type public.origem_versao as enum ('manual', 'ia', 'importacao');
create type public.tipo_comentario_tecnico as enum ('juridico', 'redacional', 'politico', 'orcamentario');
create type public.entidade_auditoria as enum ('projeto', 'versao', 'comentario', 'gabinete', 'membro', 'ia_interacao', 'usuario');
create type public.acao_auditoria as enum ('create', 'update', 'delete', 'status_change', 'ia_generate');
create type public.tipo_operacao_ia as enum ('gerar_minuta', 'revisar_texto', 'sugerir_emenda', 'sugerir_justificativa');

-- ---------------------------------------------------------------------------
-- Base utility functions
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin_plataforma()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.papel_global = 'admin_plataforma'
  );
$$;

create or replace function public.usuario_participa_gabinete(_gabinete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gabinetes_membros gm
    where gm.gabinete_id = _gabinete_id
      and gm.user_id = auth.uid()
      and gm.ativo = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel_global public.papel_global not null default 'usuario',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create table public.gabinetes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  esfera public.esfera_legislativa not null,
  orgao_casa_legislativa text not null,
  status public.status_gabinete not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_gabinetes_updated_at
before update on public.gabinetes
for each row execute function public.set_updated_at();

create table public.gabinetes_membros (
  id uuid primary key default gen_random_uuid(),
  gabinete_id uuid not null references public.gabinetes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  papel_no_gabinete public.papel_no_gabinete not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (gabinete_id, user_id)
);

create index idx_gabinetes_membros_gabinete_id on public.gabinetes_membros(gabinete_id);
create index idx_gabinetes_membros_user_id on public.gabinetes_membros(user_id);

create table public.projetos_legislativos (
  id uuid primary key default gen_random_uuid(),
  gabinete_id uuid not null references public.gabinetes(id) on delete cascade,
  titulo text not null,
  ementa text,
  status_fluxo public.status_fluxo_projeto not null default 'rascunho',
  tipo public.tipo_projeto_legislativo not null default 'PL',
  autor_responsavel_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projetos_legislativos_gabinete_id on public.projetos_legislativos(gabinete_id);
create index idx_projetos_legislativos_autor_id on public.projetos_legislativos(autor_responsavel_id);

create trigger trg_projetos_legislativos_updated_at
before update on public.projetos_legislativos
for each row execute function public.set_updated_at();

create table public.projeto_versoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos_legislativos(id) on delete cascade,
  numero_versao integer not null check (numero_versao > 0),
  conteudo_texto text not null,
  resumo_alteracoes text not null,
  criado_por uuid not null references public.users(id),
  origem public.origem_versao not null default 'manual',
  created_at timestamptz not null default now(),
  unique (projeto_id, numero_versao)
);

create index idx_projeto_versoes_projeto_id on public.projeto_versoes(projeto_id);

create table public.comentarios_tecnicos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos_legislativos(id) on delete cascade,
  versao_id uuid not null references public.projeto_versoes(id) on delete cascade,
  autor_id uuid not null references public.users(id),
  trecho_referencia text,
  comentario text not null,
  tipo public.tipo_comentario_tecnico not null,
  resolvido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comentarios_tecnicos_projeto_id on public.comentarios_tecnicos(projeto_id);
create index idx_comentarios_tecnicos_versao_id on public.comentarios_tecnicos(versao_id);

create trigger trg_comentarios_tecnicos_updated_at
before update on public.comentarios_tecnicos
for each row execute function public.set_updated_at();

create table public.auditoria_eventos (
  id bigserial primary key,
  entidade public.entidade_auditoria not null,
  entidade_id uuid not null,
  acao public.acao_auditoria not null,
  actor_user_id uuid references public.users(id),
  payload_diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_auditoria_eventos_entidade on public.auditoria_eventos(entidade, entidade_id);
create index idx_auditoria_eventos_actor on public.auditoria_eventos(actor_user_id);
create index idx_auditoria_eventos_created_at on public.auditoria_eventos(created_at desc);

create table public.ia_interacoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos_legislativos(id) on delete cascade,
  versao_id uuid references public.projeto_versoes(id) on delete set null,
  user_id uuid not null references public.users(id),
  tipo_operacao public.tipo_operacao_ia not null,
  prompt_resumo text,
  resposta_resumo text,
  tokens_input integer,
  tokens_output integer,
  custo_estimado numeric(12,4),
  created_at timestamptz not null default now()
);

create index idx_ia_interacoes_projeto_id on public.ia_interacoes(projeto_id);
create index idx_ia_interacoes_user_id on public.ia_interacoes(user_id);

-- ---------------------------------------------------------------------------
-- Audit logging functions and triggers
-- ---------------------------------------------------------------------------
create or replace function public.registrar_auditoria_evento(
  _entidade public.entidade_auditoria,
  _entidade_id uuid,
  _acao public.acao_auditoria,
  _payload_diff jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auditoria_eventos (entidade, entidade_id, acao, actor_user_id, payload_diff)
  values (_entidade, _entidade_id, _acao, auth.uid(), coalesce(_payload_diff, '{}'::jsonb));
end;
$$;

create or replace function public.trg_auditar_linha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acao public.acao_auditoria;
  v_payload jsonb;
  v_id uuid;
  v_entidade public.entidade_auditoria;
begin
  v_entidade := tg_argv[0]::public.entidade_auditoria;

  if tg_op = 'INSERT' then
    v_acao := 'create';
    v_payload := jsonb_build_object('new', to_jsonb(new));
    v_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_acao := case
      when to_jsonb(new)->>'status' is distinct from to_jsonb(old)->>'status'
        or to_jsonb(new)->>'status_fluxo' is distinct from to_jsonb(old)->>'status_fluxo'
      then 'status_change'
      else 'update'
    end;
    v_payload := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
    v_id := new.id;
  elsif tg_op = 'DELETE' then
    v_acao := 'delete';
    v_payload := jsonb_build_object('old', to_jsonb(old));
    v_id := old.id;
  else
    return null;
  end if;

  perform public.registrar_auditoria_evento(v_entidade, v_id, v_acao, v_payload);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_auditoria_gabinetes
after insert or update or delete on public.gabinetes
for each row execute function public.trg_auditar_linha('gabinete');

create trigger trg_auditoria_gabinetes_membros
after insert or update or delete on public.gabinetes_membros
for each row execute function public.trg_auditar_linha('membro');

create trigger trg_auditoria_projetos_legislativos
after insert or update or delete on public.projetos_legislativos
for each row execute function public.trg_auditar_linha('projeto');

create trigger trg_auditoria_projeto_versoes
after insert or update or delete on public.projeto_versoes
for each row execute function public.trg_auditar_linha('versao');

create trigger trg_auditoria_comentarios_tecnicos
after insert or update or delete on public.comentarios_tecnicos
for each row execute function public.trg_auditar_linha('comentario');

create or replace function public.trg_auditar_ia_interacoes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.registrar_auditoria_evento(
    'ia_interacao',
    new.id,
    'ia_generate',
    jsonb_build_object(
      'tipo_operacao', new.tipo_operacao,
      'projeto_id', new.projeto_id,
      'versao_id', new.versao_id
    )
  );
  return new;
end;
$$;

create trigger trg_auditoria_ia_interacoes
after insert on public.ia_interacoes
for each row execute function public.trg_auditar_ia_interacoes();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.gabinetes enable row level security;
alter table public.gabinetes_membros enable row level security;
alter table public.projetos_legislativos enable row level security;
alter table public.projeto_versoes enable row level security;
alter table public.comentarios_tecnicos enable row level security;
alter table public.auditoria_eventos enable row level security;
alter table public.ia_interacoes enable row level security;

-- users
create policy "users_select_self_or_admin"
on public.users for select
using (id = auth.uid() or public.is_admin_plataforma());

create policy "users_update_self_or_admin"
on public.users for update
using (id = auth.uid() or public.is_admin_plataforma())
with check (id = auth.uid() or public.is_admin_plataforma());

create policy "users_insert_self_or_admin"
on public.users for insert
with check (id = auth.uid() or public.is_admin_plataforma());

-- gabinetes
create policy "gabinetes_select_member_or_admin"
on public.gabinetes for select
using (public.usuario_participa_gabinete(id) or public.is_admin_plataforma());

create policy "gabinetes_insert_member_or_admin"
on public.gabinetes for insert
with check (auth.uid() is not null);

create policy "gabinetes_update_member_or_admin"
on public.gabinetes for update
using (public.usuario_participa_gabinete(id) or public.is_admin_plataforma())
with check (public.usuario_participa_gabinete(id) or public.is_admin_plataforma());

-- gabinetes_membros
create policy "gabinetes_membros_select_member_or_admin"
on public.gabinetes_membros for select
using (public.usuario_participa_gabinete(gabinete_id) or public.is_admin_plataforma());

create policy "gabinetes_membros_insert_chefe_or_admin"
on public.gabinetes_membros for insert
with check (public.usuario_participa_gabinete(gabinete_id) or public.is_admin_plataforma());

create policy "gabinetes_membros_update_chefe_or_admin"
on public.gabinetes_membros for update
using (public.usuario_participa_gabinete(gabinete_id) or public.is_admin_plataforma())
with check (public.usuario_participa_gabinete(gabinete_id) or public.is_admin_plataforma());

-- projetos_legislativos
create policy "projetos_select_member_or_admin"
on public.projetos_legislativos for select
using (public.usuario_participa_gabinete(gabinete_id) or public.is_admin_plataforma());

create policy "projetos_insert_member_or_admin"
on public.projetos_legislativos for insert
with check ((public.usuario_participa_gabinete(gabinete_id) and autor_responsavel_id = auth.uid()) or public.is_admin_plataforma());

create policy "projetos_update_member_or_admin"
on public.projetos_legislativos for update
using (public.usuario_participa_gabinete(gabinete_id) or public.is_admin_plataforma())
with check (public.usuario_participa_gabinete(gabinete_id) or public.is_admin_plataforma());

-- projeto_versoes
create policy "projeto_versoes_select_member_or_admin"
on public.projeto_versoes for select
using (
  exists (
    select 1
    from public.projetos_legislativos p
    where p.id = projeto_id
      and (public.usuario_participa_gabinete(p.gabinete_id) or public.is_admin_plataforma())
  )
);

create policy "projeto_versoes_insert_member_or_admin"
on public.projeto_versoes for insert
with check (
  criado_por = auth.uid()
  and exists (
    select 1
    from public.projetos_legislativos p
    where p.id = projeto_id
      and (public.usuario_participa_gabinete(p.gabinete_id) or public.is_admin_plataforma())
  )
);

-- comentarios_tecnicos
create policy "comentarios_select_member_or_admin"
on public.comentarios_tecnicos for select
using (
  exists (
    select 1
    from public.projetos_legislativos p
    where p.id = projeto_id
      and (public.usuario_participa_gabinete(p.gabinete_id) or public.is_admin_plataforma())
  )
);

create policy "comentarios_insert_member_or_admin"
on public.comentarios_tecnicos for insert
with check (
  autor_id = auth.uid()
  and exists (
    select 1
    from public.projetos_legislativos p
    where p.id = projeto_id
      and (public.usuario_participa_gabinete(p.gabinete_id) or public.is_admin_plataforma())
  )
);

create policy "comentarios_update_autor_member_or_admin"
on public.comentarios_tecnicos for update
using (
  autor_id = auth.uid()
  and exists (
    select 1
    from public.projetos_legislativos p
    where p.id = projeto_id
      and (public.usuario_participa_gabinete(p.gabinete_id) or public.is_admin_plataforma())
  )
)
with check (
  exists (
    select 1
    from public.projetos_legislativos p
    where p.id = projeto_id
      and (public.usuario_participa_gabinete(p.gabinete_id) or public.is_admin_plataforma())
  )
);

-- auditoria_eventos
create policy "auditoria_select_member_or_admin"
on public.auditoria_eventos for select
using (
  public.is_admin_plataforma()
  or actor_user_id = auth.uid()
  or (
    entidade = 'projeto'
    and exists (
      select 1
      from public.projetos_legislativos p
      where p.id = auditoria_eventos.entidade_id
        and public.usuario_participa_gabinete(p.gabinete_id)
    )
  )
);

create policy "auditoria_insert_system_or_admin"
on public.auditoria_eventos for insert
with check (public.is_admin_plataforma() or auth.role() = 'service_role');

-- ia_interacoes
create policy "ia_interacoes_select_member_or_admin"
on public.ia_interacoes for select
using (
  user_id = auth.uid()
  or public.is_admin_plataforma()
  or exists (
    select 1
    from public.projetos_legislativos p
    where p.id = projeto_id
      and public.usuario_participa_gabinete(p.gabinete_id)
  )
);

create policy "ia_interacoes_insert_owner_or_admin"
on public.ia_interacoes for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projetos_legislativos p
    where p.id = projeto_id
      and (public.usuario_participa_gabinete(p.gabinete_id) or public.is_admin_plataforma())
  )
);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update on
  public.users,
  public.gabinetes,
  public.gabinetes_membros,
  public.projetos_legislativos,
  public.projeto_versoes,
  public.comentarios_tecnicos,
  public.auditoria_eventos,
  public.ia_interacoes
to authenticated;

grant usage, select on sequence public.auditoria_eventos_id_seq to authenticated;
