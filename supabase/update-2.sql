-- MISE À JOUR 2 : adaptation au métier (techniciens radio / télévision / web radio)
-- À exécuter UNE fois dans Supabase > SQL Editor

-- 1) Nouveau champ : employeur / média (RTI, France 24, web radio, indépendant…)
alter table public.memberships add column if not exists employeur text check (employeur is null or char_length(employeur) <= 120);

-- 2) Nouvelle liste de spécialités
delete from public.technician_skills;
insert into public.technician_skills(name) values
 ('Prise de son et mixage'),
 ('Sonorisation et studio son'),
 ('Cadrage et prise de vue'),
 ('Montage vidéo'),
 ('Réalisation technique et régie'),
 ('Diffusion et playout TV / radio'),
 ('Émetteurs et transmission (FM, TNT)'),
 ('Liaisons satellite et faisceaux hertziens'),
 ('Streaming, encodage et web radio'),
 ('Réseaux et informatique broadcast'),
 ('Maintenance électronique broadcast'),
 ('Éclairage de plateau'),
 ('Habillage antenne et infographie'),
 ('Antennes et réception');

-- 3) Renommer l'actualité de démonstration (« UNTRTCI Mobile » → « UNTRTCI »)
update public.news set title = replace(title, 'UNTRTCI Mobile', 'UNTRTCI') where title like '%UNTRTCI Mobile%';
