-- MISE À JOUR 3 : réseaux sociaux + galerie photos des activités
-- À exécuter UNE fois dans Supabase > SQL Editor

-- Réseaux sociaux
create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  platform text not null default 'autre',
  url text not null check (url ~* '^https?://'),
  created_at timestamptz not null default now()
);
grant select on public.social_links to anon, authenticated;
grant insert, update, delete on public.social_links to authenticated;
grant all on public.social_links to service_role;
alter table public.social_links enable row level security;
create policy "social lecture" on public.social_links for select to anon, authenticated using (true);
create policy "social personnel" on public.social_links for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Galerie des activités
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  caption text,
  taken_on date,
  image_path text not null,
  created_at timestamptz not null default now()
);
grant select on public.gallery_items to anon, authenticated;
grant insert, update, delete on public.gallery_items to authenticated;
grant all on public.gallery_items to service_role;
alter table public.gallery_items enable row level security;
create policy "galerie lecture" on public.gallery_items for select to anon, authenticated using (true);
create policy "galerie personnel" on public.gallery_items for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Espace de stockage public pour les photos d'activités
insert into storage.buckets (id, name, public) values ('gallery', 'gallery', true)
on conflict (id) do nothing;
create policy "galerie fichiers: envoi par le personnel" on storage.objects
  for insert to authenticated with check (bucket_id = 'gallery' and public.is_staff(auth.uid()));
create policy "galerie fichiers: suppression par le personnel" on storage.objects
  for delete to authenticated using (bucket_id = 'gallery' and public.is_staff(auth.uid()));
