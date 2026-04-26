-- Vincula projetos legislativos a normas da Biblioteca Legislativa usadas como referencia

create table if not exists public.projeto_normas_referencias (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos_legislativos(id) on delete cascade,
  norma_id uuid not null references public.biblioteca_normas(id) on delete cascade,
  observacao text,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (projeto_id, norma_id)
);

create index if not exists idx_projeto_normas_referencias_projeto on public.projeto_normas_referencias(projeto_id);
create index if not exists idx_projeto_normas_referencias_norma on public.projeto_normas_referencias(norma_id);

alter table public.projeto_normas_referencias enable row level security;

drop policy if exists "projeto_normas_referencias_select_member_or_admin" on public.projeto_normas_referencias;
create policy "projeto_normas_referencias_select_member_or_admin"
on public.projeto_normas_referencias for select
using (
  public.is_admin_plataforma()
  or exists (
    select 1
    from public.projetos_legislativos p
    where p.id = projeto_id
      and public.usuario_participa_gabinete(p.gabinete_id)
  )
);

drop policy if exists "projeto_normas_referencias_insert_member_or_admin" on public.projeto_normas_referencias;
create policy "projeto_normas_referencias_insert_member_or_admin"
on public.projeto_normas_referencias for insert
with check (
  public.is_admin_plataforma()
  or (
    created_by = auth.uid()
    and exists (
      select 1
      from public.projetos_legislativos p
      where p.id = projeto_id
        and public.usuario_participa_gabinete(p.gabinete_id)
    )
  )
);

drop policy if exists "projeto_normas_referencias_delete_member_or_admin" on public.projeto_normas_referencias;
create policy "projeto_normas_referencias_delete_member_or_admin"
on public.projeto_normas_referencias for delete
using (
  public.is_admin_plataforma()
  or exists (
    select 1
    from public.projetos_legislativos p
    where p.id = projeto_id
      and public.usuario_participa_gabinete(p.gabinete_id)
  )
);

grant select, insert, delete on public.projeto_normas_referencias to authenticated;
