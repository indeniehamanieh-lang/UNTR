-- MISE À JOUR 5 : pseudo, photo d'identité PDF obligatoire, frais d'adhésion 5 000 FCFA obligatoires, spécialité « Ingénieur des médias »
-- À exécuter UNE fois dans Supabase > SQL Editor (après update-1 à update-4)

-- 1) Pseudo
alter table public.memberships add column if not exists pseudo text
  check (pseudo is null or char_length(pseudo) between 2 and 40);

-- 2) Nouvelle spécialité
insert into public.technician_skills(name) values ('Ingénieur des médias') on conflict (name) do nothing;

-- 3) Photo d'identité : nouveau type de document, au format PDF uniquement
alter table public.member_documents drop constraint if exists member_documents_kind_check;
alter table public.member_documents add constraint member_documents_kind_check
  check (kind in ('photo_identite','cni','passeport','permis','autre'));
alter table public.member_documents drop constraint if exists member_documents_pdf_check;
alter table public.member_documents add constraint member_documents_pdf_check
  check (kind <> 'photo_identite' or path ~* '\.pdf$');

-- 4) Frais d'adhésion fixés à 5 000 FCFA
alter table public.payment_settings add column if not exists adhesion_fee_xof integer not null default 5000
  check (adhesion_fee_xof >= 0);
update public.payment_settings set adhesion_fee_xof = 5000 where id = 1;
alter table public.payments add column if not exists purpose text not null default 'adhesion'
  check (purpose in ('adhesion','cotisation'));

drop policy if exists "paiements: ajout par le membre" on public.payments;
create policy "paiements: ajout par le membre" on public.payments
  for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'en_attente' and reviewed_by is null and valid_until is null
    and (purpose <> 'adhesion' or amount_xof = (select adhesion_fee_xof from public.payment_settings where id = 1))
  );

-- 5) Décision sur un paiement (la durée de validité ne concerne que la cotisation annuelle)
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
    valid_until = case when _status = 'validee' and p.purpose = 'cotisation' then (current_date + make_interval(months => coalesce(months, 12)))::date else null end
  where id = _id;
  insert into public.notifications(user_id, title, body) values (p.user_id,
    case when _status = 'validee' then 'Paiement validé' else 'Paiement refusé' end,
    case when _status = 'validee' then 'Vos frais d''adhésion ont été confirmés. Merci !'
         else 'Votre paiement n''a pas pu être confirmé. ' || coalesce(left(_note, 200), 'Contactez l''Union.') end);
end $$;
revoke execute on function public.review_payment(uuid, text, text) from public, anon;
grant execute on function public.review_payment(uuid, text, text) to authenticated;

-- 6) Validation d'une adhésion : photo d'identité PDF ET frais d'adhésion validés obligatoires
create or replace function public.review_membership(_id uuid, _status public.membership_status, _note text default null)
returns public.memberships language plpgsql security definer set search_path = public as $$
declare m public.memberships;
begin
  if not public.is_manager(auth.uid()) then raise exception 'Accès refusé'; end if;
  select * into m from public.memberships where id = _id for update;
  if not found then raise exception 'Dossier introuvable'; end if;
  if m.user_id = auth.uid() then raise exception 'Vous ne pouvez pas traiter votre propre dossier'; end if;
  if _status = 'validee' then
    if not exists (select 1 from public.member_documents where user_id = m.user_id and kind = 'photo_identite') then
      raise exception 'Validation impossible : la photo d''identité (PDF) est manquante.';
    end if;
    if not exists (select 1 from public.payments where user_id = m.user_id and purpose = 'adhesion' and status = 'validee') then
      raise exception 'Validation impossible : les frais d''adhésion (5 000 FCFA) ne sont pas payés ou pas encore validés.';
    end if;
  end if;
  perform set_config('app.bypass_membership','on', true);
  if _status = 'validee' then
    update public.memberships set status='validee', review_note=_note,
      member_number = coalesce(member_number, 'UNT-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.member_number_seq')::text,5,'0')),
      card_token = gen_random_uuid(), card_revoked=false,
      validated_at = now(), expires_at = now() + interval '1 year'
    where id=_id returning * into m;
  else
    update public.memberships set status=_status, review_note=_note,
      card_revoked = case when _status in ('refusee','suspendue','expiree') then true else card_revoked end
    where id=_id returning * into m;
  end if;
  perform set_config('app.bypass_membership','off', true);
  perform public.log_action('membership.' || _status::text, _id::text, jsonb_build_object('note',_note,'member_number',m.member_number));
  insert into public.notifications(user_id, title, body) values (m.user_id, 'Mise à jour de votre adhésion',
    case _status when 'validee' then 'Votre adhésion est validée. Votre carte de membre est disponible.'
      when 'refusee' then 'Votre demande d''adhésion a été refusée.' || coalesce(' Motif : '||_note,'')
      when 'suspendue' then 'Votre adhésion est suspendue.' || coalesce(' Motif : '||_note,'')
      else 'Le statut de votre adhésion a changé.' end);
  return m;
end $$;
