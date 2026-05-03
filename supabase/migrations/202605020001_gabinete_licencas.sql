-- Commercial licensing layer for contracted legislative offices.

create table if not exists public.gabinete_licencas (
  gabinete_id uuid primary key references public.gabinetes(id) on delete cascade,
  plano text not null default 'essencial' check (plano in ('essencial', 'profissional', 'institucional')),
  limite_usuarios integer not null default 6 check (limite_usuarios > 0),
  limite_projetos_mes integer not null default 30 check (limite_projetos_mes > 0),
  status text not null default 'ativo' check (status in ('ativo', 'suspenso', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_gabinete_licencas_updated_at
before update on public.gabinete_licencas
for each row execute function public.set_updated_at();

insert into public.gabinete_licencas (gabinete_id)
select id
from public.gabinetes
on conflict (gabinete_id) do nothing;

alter table public.gabinete_licencas enable row level security;

create policy "gabinete_licencas_select_member_or_admin"
on public.gabinete_licencas for select
using (public.usuario_participa_gabinete(gabinete_id) or public.is_admin_plataforma());

create policy "gabinete_licencas_insert_admin"
on public.gabinete_licencas for insert
with check (public.is_admin_plataforma());

create policy "gabinete_licencas_update_admin"
on public.gabinete_licencas for update
using (public.is_admin_plataforma())
with check (public.is_admin_plataforma());

grant select, insert, update on public.gabinete_licencas to authenticated;
