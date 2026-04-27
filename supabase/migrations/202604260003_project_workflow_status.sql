-- Adds the MVP workflow controls required before justification generation.

alter table public.projetos_legislativos
add column if not exists approved_minuta boolean not null default false;

alter table public.projetos_legislativos
add column if not exists workflow_status text not null default 'draft';

do $$
begin
  alter table public.projetos_legislativos
  add constraint projetos_legislativos_workflow_status_check
  check (
    workflow_status in (
      'draft',
      'analysis_generated',
      'minuta_generated',
      'minuta_approved',
      'justificativa_generated',
      'docx_exported'
    )
  );
exception
  when duplicate_object then null;
end $$;

update public.projetos_legislativos
set workflow_status = case
  when status_fluxo = 'rascunho' then 'draft'
  when status_fluxo = 'em_revisao' then 'minuta_generated'
  when status_fluxo = 'aprovado_interno' then 'minuta_approved'
  when status_fluxo = 'protocolado' then 'docx_exported'
  else workflow_status
end
where workflow_status = 'draft';
