-- MISE À JOUR 4 : cotisations (paiement déclaré par Mobile Money, validé par les responsables)
-- À exécuter UNE fois dans Supabase > SQL Editor

-- Réglages : montant et durée de la cotisation
create table if not exists public.payment_settings (
  id int primary key default 1 check (id = 1),
  amount_xof integer not null default 0 check (amount_xof >= 0),
  duration_months integer not null default 12 check (duration_months between 1 and 120),
  instructions text check (instructions is null or char_length(instructions) <= 1000),
  updated_at timestamptz not null default now()
);
insert into public.payment_settings(id) values (1) on conflict do nothing;
grant select on public.payment_settings to authenticated;
grant insert, update on public.payment_settings to authenticated;
grant all on public.payment_settings to service_role;
alter table public.payment_settings enable row level security;
create policy "reglages lecture" on public.payment_settings for select to authenticated using (true);
create policy "reglages responsables" on public.payment_settings for all to authenticated
  using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- Numéros Mobile Money de l'Union
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  provider text not null default 'autre',
  number text not null check (char_length(number) between 3 and 40),
  holder text check (holder is null or char_length(holder) <= 80),
  created_at timestamptz not null default now()
);
grant select on public.payment_methods to authenticated;
grant insert, update, delete on public.payment_methods to authenticated;
grant all on public.payment_methods to service_role;
alter table public.payment_methods enable row level security;
create policy "moyens lecture" on public.payment_methods for select to authenticated using (true);
create policy "moyens responsables" on public.payment_methods for all to authenticated
  using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- Paiements déclarés par les membres
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_xof integer not null check (amount_xof > 0),
  provider text not null,
  reference text not null check (char_length(reference) between 4 and 60),
  proof_path text,
  status text not null default 'en_attente' check (status in ('en_attente','validee','refusee')),
  note text check (note is null or char_length(note) <= 300),
  valid_until date,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
-- Une même référence de transaction ne peut servir qu'une fois
create unique index if not exists payments_ref_unique on public.payments (provider, lower(reference));
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
grant select, insert on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "paiements: lecture membre ou responsable" on public.payments
  for select to authenticated using (user_id = auth.uid() or public.is_manager(auth.uid()));
create policy "paiements: ajout par le membre" on public.payments
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'en_attente' and reviewed_by is null and valid_until is null);

-- Décision d'un responsable (valider / refuser) : seule façon de changer un paiement
create or replace function public.review_payment(_id uuid, _status text, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments; months int;
begin
  if not public.is_manager(auth.uid()) then raise exception 'Accès refusé'; end if;
  if _status not in ('validee','refusee') then raise exception 'Statut invalide'; end if;
  select * into p from public.payments where id = _id for update;
  if not found then raise exception 'Paiement introuvable'; end if;
  select duration_months into months from public.payment_settings where id = 1;
  update public.payments set status = _status, note = left(_note, 300), reviewed_by = auth.uid(), reviewed_at = now(),
    valid_until = case when _status = 'validee' then (current_date + make_interval(months => coalesce(months, 12)))::date else null end
  where id = _id;
  insert into public.notifications(user_id, title, body) values (p.user_id,
    case when _status = 'validee' then 'Cotisation validée' else 'Cotisation refusée' end,
    case when _status = 'validee' then 'Votre paiement de cotisation a été confirmé. Merci !'
         else 'Votre paiement n''a pas pu être confirmé. ' || coalesce(left(_note, 200), 'Contactez l''Union.') end);
end $$;
revoke execute on function public.review_payment(uuid, text, text) from public, anon;
grant execute on function public.review_payment(uuid, text, text) to authenticated;

-- Justificatifs (captures d'écran) : espace PRIVÉ
insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;
create policy "justificatifs: envoi dans son dossier" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "justificatifs: lecture membre ou responsable" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_manager(auth.uid())));
