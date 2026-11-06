-- MISE À JOUR 6 : cotisation (1 000 FCFA par mois, 12 000 FCFA pour l'année), indépendante des frais d'adhésion
-- À exécuter UNE fois dans Supabase > SQL Editor (après update-5)

alter table public.payment_settings add column if not exists monthly_fee_xof integer not null default 1000
  check (monthly_fee_xof >= 0);
update public.payment_settings set monthly_fee_xof = 1000 where id = 1;

alter table public.payments add column if not exists months integer
  check (months is null or months between 1 and 12);

drop policy if exists "paiements: ajout par le membre" on public.payments;
create policy "paiements: ajout par le membre" on public.payments
  for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'en_attente' and reviewed_by is null and valid_until is null
    and (
      (purpose = 'adhesion' and months is null
        and amount_xof = (select adhesion_fee_xof from public.payment_settings where id = 1))
      or
      (purpose = 'cotisation' and months is not null
        and amount_xof = months * (select monthly_fee_xof from public.payment_settings where id = 1)
        and exists (select 1 from public.memberships where user_id = auth.uid() and status = 'validee'))
    )
  );

-- La cotisation validée prolonge la période : chaque paiement s'ajoute à la suite du précédent
create or replace function public.review_payment(_id uuid, _status text, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments; cur date; base date; new_until date;
begin
  if not public.is_manager(auth.uid()) then raise exception 'Accès refusé'; end if;
  if _status not in ('validee','refusee') then raise exception 'Statut invalide'; end if;
  select * into p from public.payments where id = _id for update;
  if not found then raise exception 'Paiement introuvable'; end if;
  if _status = 'validee' and p.purpose = 'cotisation' then
    select max(valid_until) into cur from public.payments
      where user_id = p.user_id and purpose = 'cotisation' and status = 'validee' and id <> _id;
    base := greatest(coalesce(cur, current_date), current_date);
    new_until := (base + make_interval(months => coalesce(p.months, 1)))::date;
  end if;
  update public.payments set status = _status, note = left(_note, 300), reviewed_by = auth.uid(), reviewed_at = now(),
    valid_until = new_until
  where id = _id;
  insert into public.notifications(user_id, title, body) values (p.user_id,
    case when _status = 'validee' then (case when p.purpose = 'cotisation' then 'Cotisation validée' else 'Frais d''adhésion validés' end)
         else 'Paiement refusé' end,
    case when _status = 'validee' then
           (case when p.purpose = 'cotisation' then 'Votre cotisation est confirmée, valable jusqu''au ' || to_char(new_until, 'DD/MM/YYYY') || '. Merci !'
                 else 'Vos frais d''adhésion ont été confirmés. Merci !' end)
         else 'Votre paiement n''a pas pu être confirmé. ' || coalesce(left(_note, 200), 'Contactez l''Union.') end);
end $$;
revoke execute on function public.review_payment(uuid, text, text) from public, anon;
grant execute on function public.review_payment(uuid, text, text) to authenticated;
