-- À exécuter UNE fois dans Supabase > SQL Editor (après schema.sql)
-- Crée l'espace de stockage des photos de membres.
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;

create policy "photos: envoi dans son dossier" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'member-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: mise à jour dans son dossier" on storage.objects
  for update to authenticated
  using (bucket_id = 'member-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: lecture de ses photos ou par le personnel" on storage.objects
  for select to authenticated
  using (bucket_id = 'member-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid())));
