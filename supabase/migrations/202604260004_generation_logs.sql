-- Operational logs for official Amygo Legislativo pipeline transitions.

create table if not exists public.generation_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projetos_legislativos(id) on delete cascade,
  stage text not null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  success boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_generation_logs_project_id on public.generation_logs(project_id);
create index if not exists idx_generation_logs_created_at on public.generation_logs(created_at desc);

alter table public.generation_logs enable row level security;

drop policy if exists "generation_logs_select_member_or_admin" on public.generation_logs;
create policy "generation_logs_select_member_or_admin"
on public.generation_logs for select
using (
  public.is_admin_plataforma()
  or exists (
    select 1
    from public.projetos_legislativos p
    where p.id = project_id
      and public.usuario_participa_gabinete(p.gabinete_id)
  )
);

drop policy if exists "generation_logs_insert_system_or_admin" on public.generation_logs;
create policy "generation_logs_insert_system_or_admin"
on public.generation_logs for insert
with check (public.is_admin_plataforma() or auth.role() = 'service_role');

grant select on public.generation_logs to authenticated;
