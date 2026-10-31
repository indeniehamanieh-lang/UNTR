-- MISE À JOUR 1 : pièces d'identité des membres
-- À exécuter UNE fois dans Supabase > SQL Editor (après schema.sql et storage.sql)

create table if not exists public.member_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'cni' check (kind in ('cni','passeport','permis','autre')),
  path text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.member_documents to authenticated;
grant all on public.member_documents to service_role;
alter table public.member_documents enable row level security;

create policy "pieces: lecture par le membre ou un responsable" on public.member_documents
  for select to authenticated using (user_id = auth.uid() or public.is_manager(auth.uid()));
create policy "pieces: ajout par le membre" on public.member_documents
  for insert to authenticated with check (user_id = auth.uid());
create policy "pieces: suppression par le membre" on public.member_documents
  for delete to authenticated using (user_id = auth.uid());

-- Espace de stockage PRIVÉ pour les pièces d'identité
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

create policy "id-docs: envoi dans son dossier" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "id-docs: lecture par le membre ou un responsable" on storage.objects
  for select to authenticated
  using (bucket_id = 'id-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_manager(auth.uid())));
create policy "id-docs: suppression par le membre" on storage.objects
  for delete to authenticated
  using (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Journal : qui a consulté la pièce d'identité de qui
create or replace function public.log_document_view(_member uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager(auth.uid()) then raise exception 'Accès refusé'; end if;
  insert into public.audit_logs(actor_id, action, target, details)
  values (auth.uid(), 'document.view', _member::text, null);
end $$;
revoke execute on function public.log_document_view(uuid) from public, anon;
grant execute on function public.log_document_view(uuid) to authenticated;
