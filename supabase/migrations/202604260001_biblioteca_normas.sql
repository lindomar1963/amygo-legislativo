-- Biblioteca Legislativa - normas cadastradas pelo usuario

create table if not exists public.biblioteca_normas (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  titulo text not null,
  esfera text not null check (esfera in ('municipal', 'estadual', 'federal')),
  uf char(2),
  municipio text,
  orgao_origem text not null,
  tipo text not null default 'lei',
  numero text,
  ano integer,
  tema text,
  ementa text,
  texto_integral text,
  fonte_url text,
  arquivo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_biblioteca_normas_owner on public.biblioteca_normas(owner_user_id);
create index if not exists idx_biblioteca_normas_esfera on public.biblioteca_normas(esfera);
create index if not exists idx_biblioteca_normas_tema on public.biblioteca_normas(tema);
create index if not exists idx_biblioteca_normas_created_at on public.biblioteca_normas(created_at desc);

drop trigger if exists trg_biblioteca_normas_updated_at on public.biblioteca_normas;
create trigger trg_biblioteca_normas_updated_at
before update on public.biblioteca_normas
for each row execute function public.set_updated_at();

alter table public.biblioteca_normas enable row level security;

drop policy if exists "biblioteca_normas_select_owner_or_admin" on public.biblioteca_normas;
create policy "biblioteca_normas_select_owner_or_admin"
on public.biblioteca_normas for select
using (owner_user_id = auth.uid() or public.is_admin_plataforma());

drop policy if exists "biblioteca_normas_insert_owner_or_admin" on public.biblioteca_normas;
create policy "biblioteca_normas_insert_owner_or_admin"
on public.biblioteca_normas for insert
with check (owner_user_id = auth.uid() or public.is_admin_plataforma());

drop policy if exists "biblioteca_normas_update_owner_or_admin" on public.biblioteca_normas;
create policy "biblioteca_normas_update_owner_or_admin"
on public.biblioteca_normas for update
using (owner_user_id = auth.uid() or public.is_admin_plataforma())
with check (owner_user_id = auth.uid() or public.is_admin_plataforma());

drop policy if exists "biblioteca_normas_delete_owner_or_admin" on public.biblioteca_normas;
create policy "biblioteca_normas_delete_owner_or_admin"
on public.biblioteca_normas for delete
using (owner_user_id = auth.uid() or public.is_admin_plataforma());

grant select, insert, update, delete on public.biblioteca_normas to authenticated;
